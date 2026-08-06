# -*- coding: utf-8 -*-
"""market.py —— 每日行情快照（东方财富公开接口，无需密钥）
抓取：指数 / 行业板块 / 概念板块 / 领涨个股 / 热门个股 / 热门基金估值
输出 docs/data/market/snapshot.json，失败自动降级不中断 CI。
"""
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
TZ = timezone(timedelta(hours=8))
TIMEOUT = 8

# 热门基金（供估值抓取 + 前端搜索）
POPULAR_FUNDS = [
    ("161725", "招商中证白酒指数(LOF)A"), ("012414", "招商中证白酒指数C"),
    ("110011", "易方达优质精选混合"), ("005827", "易方达蓝筹精选混合"),
    ("110022", "易方达消费行业股票"), ("110003", "易方达上证50增强A"),
    ("000961", "天弘沪深300ETF联接A"), ("001594", "天弘中证银行ETF联接A"),
    ("012348", "天弘中证光伏产业指数A"), ("001618", "天弘中证电子ETF联接A"),
    ("003095", "中欧医疗健康混合A"), ("001875", "前海开源沪港深优势精选"),
    ("005911", "广发双擎升级混合A"), ("270042", "广发纳斯达克100指数A"),
    ("050025", "博时标普500ETF联接A"), ("007301", "国联安中证全指半导体ETF联接A"),
    ("161028", "富国中证新能源汽车指数A"), ("004069", "南方中证全指证券公司ETF联接A"),
    ("160119", "南方中证500ETF联接A"), ("040046", "华安纳斯达克100指数A"),
    ("002230", "华夏上证50ETF联接A"), ("005918", "天弘中证计算机ETF联接A"),
    ("001593", "天弘创业板ETF联接A"), ("003096", "中欧医疗健康混合C"),
    ("005313", "万家中证1000指数增强A"), ("000689", "前海开源沪深300指数"),
    ("011103", "天弘中证科创创业50ETF联接A"), ("012928", "易方达中证人工智能ETF联接A"),
    ("011609", "天弘中证芯片产业指数A"), ("001548", "天弘上证50指数A"),
    ("000248", "汇添富中证主要消费ETF联接A"), ("001186", "富国文体健康股票A"),
]

# 热门个股（供自选列表快速匹配）
POPULAR_STOCKS = [
    ("600519", "贵州茅台"), ("300750", "宁德时代"), ("002594", "比亚迪"),
    ("601318", "中国平安"), ("600036", "招商银行"), ("000858", "五粮液"),
    ("000568", "泸州老窖"), ("601899", "紫金矿业"), ("600809", "山西汾酒"),
    ("000333", "美的集团"), ("000651", "格力电器"), ("688981", "中芯国际"),
    ("601012", "隆基绿能"), ("603259", "药明康德"), ("300059", "东方财富"),
    ("600030", "中信证券"), ("601398", "工商银行"), ("601857", "中国石油"),
    ("600276", "恒瑞医药"), ("002415", "海康威视"),
]

INDEX_SECIDS = ["1.000001", "0.399001", "0.399006", "1.000300", "1.000688"]


def http_get(url, timeout=TIMEOUT):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Referer": "https://quote.eastmoney.com/",
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "ignore")


def http_json(url, timeout=TIMEOUT):
    """请求并解析 JSON / JSONP，失败抛异常由调用方兜底"""
    text = http_get(url, timeout).strip()
    if not text:
        raise RuntimeError("empty response")
    if text.startswith("{"):
        return json.loads(text)
    i, j = text.find("("), text.rfind(")")
    if i >= 0 and j > i:
        return json.loads(text[i + 1:j])
    return json.loads(text)


def fnum(v):
    try:
        if v is None or v == "-" or v == "":
            return None
        return float(v)
    except Exception:
        return None


def diff_rows(payload):
    data = payload.get("data") or {}
    d = data.get("diff") or []
    return d if isinstance(d, list) else (list(d.values()) if isinstance(d, dict) else [])


def row_item(row):
    return {
        "code": str(row.get("f12", "")),
        "name": str(row.get("f14", "")),
        "price": fnum(row.get("f2")),
        "chg": fnum(row.get("f4")),
        "pct": fnum(row.get("f3")),
    }


def main():
    repo = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    out = repo / "docs" / "data" / "market" / "snapshot.json"
    now = datetime.now(TZ)
    snap = {
        "updated": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "indices": [],
        "sectors": [],
        "concepts": [],
        "movers": [],
        "quotes": {},
        "funds": [],
        "fundSearch": [],
    }

    # 1) 指数
    try:
        url = ("https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&secids="
               + ",".join(INDEX_SECIDS) + "&fields=f2,f3,f4,f12,f14")
        for row in diff_rows(http_json(url)):
            item = row_item(row)
            if item["code"]:
                snap["indices"].append(item)
    except Exception as e:
        print("indices fail:", e)

    # 2) 行业板块 / 概念板块（按涨跌幅排序）
    for key, fs, pz in (("sectors", "m:90+t:2", 20), ("concepts", "m:90+t:3", 12)):
        try:
            url = ("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=%d&po=1&np=1&fltt=2&invt=2&fid=f3"
                   "&fs=%s&fields=f2,f3,f4,f12,f14") % (pz, urllib.parse.quote(fs))
            for row in diff_rows(http_json(url)):
                item = row_item(row)
                if item["code"]:
                    snap[key].append(item)
        except Exception as e:
            print(key, "fail:", e)

    # 3) 领涨个股 + 热门个股快照
    try:
        url = ("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=8&po=1&np=1&fltt=2&invt=2&fid=f3"
               "&fs=" + urllib.parse.quote("m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048")
               + "&fields=f2,f3,f4,f12,f14")
        for row in diff_rows(http_json(url)):
            item = row_item(row)
            if item["code"]:
                snap["movers"].append(item)
                snap["quotes"][item["code"]] = item
    except Exception as e:
        print("movers fail:", e)
    try:
        secids = ",".join(("1." + c if c.startswith(("6", "9")) else "0." + c) for c, _ in POPULAR_STOCKS)
        url = ("https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&secids=" + secids
               + "&fields=f2,f3,f4,f12,f14")
        for row in diff_rows(http_json(url)):
            item = row_item(row)
            if item["code"]:
                snap["quotes"][item["code"]] = item
    except Exception as e:
        print("popular stocks fail:", e)

    # 4) 热门基金估值（逐个抓取，失败保留名称）
    seen = set()
    fund_list = []
    for code, name in POPULAR_FUNDS:
        if code in seen:
            continue
        seen.add(code)
        fund_list.append({"code": code, "name": name})
    snap["fundSearch"] = fund_list
    for f in fund_list:
        try:
            url = "https://fundgz.1234567.com.cn/js/%s.js?rt=%d" % (f["code"], int(now.timestamp()))
            d = http_json(url)
            snap["funds"].append({
                "code": f["code"],
                "name": d.get("name") or f["name"],
                "jzrq": d.get("jzrq", ""),
                "dwjz": fnum(d.get("dwjz")),
                "gsz": fnum(d.get("gsz")),
                "gszzl": fnum(d.get("gszzl")),
                "gztime": d.get("gztime", ""),
            })
        except Exception:
            snap["funds"].append({"code": f["code"], "name": f["name"],
                                  "jzrq": "", "dwjz": None, "gsz": None, "gszzl": None, "gztime": ""})

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    print("snapshot saved:", out)
    print("indices=%d sectors=%d concepts=%d movers=%d quotes=%d funds=%d" % (
        len(snap["indices"]), len(snap["sectors"]), len(snap["concepts"]),
        len(snap["movers"]), len(snap["quotes"]), len(snap["funds"])))


if __name__ == "__main__":
    main()