# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""douyin.py —— 抖音数据抓取（热榜 + 搜索增强 + 话题轮换兜底）"""
import json
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")


def _http_get(url, timeout=6, cookie=None):
    headers = {
        "User-Agent": UA,
        "Referer": "https://www.douyin.com/",
        "Accept": "text/html,application/json,text/plain,*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
    }
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "ignore")


def hot_words(cookie=None):
    """获取抖音今日热榜关键词，失败返回 []"""
    candidates = [
        "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&source=6",
        "https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/words/",
    ]
    for url in candidates:
        try:
            data = json.loads(_http_get(url, cookie=cookie))
            if isinstance(data, dict) and isinstance(data.get("data"), dict):
                words = [w.get("word") for w in data["data"].get("word_list", []) if w.get("word")]
                if words:
                    return words
            if isinstance(data, dict) and isinstance(data.get("word_list"), list):
                words = [w.get("word") for w in data["word_list"] if w.get("word")]
                if words:
                    return words
        except Exception:
            continue
    return []


def _parse_search(text):
    """解析网页搜索接口返回的视频列表，失败返回 []"""
    try:
        data = json.loads(text)
    except Exception:
        return []
    awemes = []
    if isinstance(data, dict):
        if isinstance(data.get("data"), dict):
            awemes = data["data"].get("aweme_list") or []
        elif isinstance(data.get("aweme_list"), list):
            awemes = data["aweme_list"]
    out = []
    for a in awemes:
        try:
            if not isinstance(a, dict):
                continue
            desc = (a.get("desc") or "").strip()
            if not desc:
                continue
            author = (a.get("author") or {}).get("nickname", "") or ""
            duration = a.get("duration", 0) or 0
            dur = "%02d:%02d" % (duration // 1000 // 60, duration // 1000 % 60) if duration else ""
            aweme_id = str(a.get("aweme_id", "") or "")
            share = ""
            for k in ("share_url", "url"):
                if a.get(k):
                    share = a[k]
                    break
            if not share and aweme_id:
                share = "https://www.douyin.com/video/" + aweme_id
            cover = ""
            play = ""
            vid = a.get("video") or {}
            cover_list = vid.get("cover") or {}
            if cover_list.get("url_list"):
                cover = cover_list["url_list"][0]
            play_list = vid.get("play_addr") or {}
            if play_list.get("url_list"):
                for u in play_list["url_list"]:
                    if "playwm" in u:
                        continue  # 跳过带水印地址
                    play = u
                    break
                if not play:
                    play = play_list["url_list"][0]
            item = {"title": desc, "author": author, "duration": dur, "url": share, "cover": cover}
            if play:
                item["play"] = play
            out.append(item)
        except Exception:
            continue
    return out


def search_videos(keyword, limit=5, cookie=None):
    """尝试调用抖音网页搜索接口（需要签名，通常会被拦截，仅作增强尝试）"""
    params = {
        "device_platform": "webapp",
        "aid": "6383",
        "channel": "channel_pc_web",
        "keyword": keyword,
        "search_channel": "aweme_general",
        "sort_type": "0",
        "publish_time": "0",
        "search_type": "1",
    }
    url = "https://www.douyin.com/aweme/v1/web/search/item/?" + urllib.parse.urlencode(params)
    try:
        return _parse_search(_http_get(url, cookie=cookie))[:limit]
    except Exception:
        return []


def fallback_videos(topics, limit, day_index):
    """话题池轮换兜底：保证每天内容不同、链接有效（跳转抖音搜索）"""
    n = len(topics)
    if n == 0:
        return []
    start = day_index % n
    picked = []
    for i in range(limit):
        kw = topics[(start + i * 3) % n]
        picked.append({
            "title": kw,
            "author": "抖音热门",
            "duration": "",
            "url": "https://www.douyin.com/search/" + urllib.parse.quote(kw) + "?type=video",
            "cover": "",
        })
    return picked


def _hot_entries(hot):
    return [{"title": h, "author": "抖音今日热榜", "duration": "", "url": "https://www.douyin.com/search/" + urllib.parse.quote(h) + "?type=video", "cover": ""} for h in hot]


def get_videos(topics, limit, day_index, cookie=None, hot=None, blend_hot=False):
    """综合获取：优先实时搜索，失败则话题池轮换兜底（保证分类相关）；
    blend_hot=True 时（爆款脚本等泛娱乐板块）混入抖音热榜关键词"""
    got = []
    for kw in topics[:1]:
        got = search_videos(kw, limit, cookie)
        if got:
            break
    if got:
        return got[:limit]
    picked = fallback_videos(topics, limit, day_index)
    if blend_hot:
        hot = hot or []
        picked = (_hot_entries(hot[:2]) + picked)[:limit]
    return picked[:limit]


