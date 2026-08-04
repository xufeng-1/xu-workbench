# -*- coding: utf-8 -*-
"""content.py —— 内容生成：单词词库 / 新概念课文 / 公版书全文 / 脚本生成"""
import csv
import io
import json
import os
import random
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pools import NCE_TEMPLATES, NCE_WORD_POOL

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"


def http_get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


# ---------------- 单词词库（ECDICT 公共词库，按标签过滤） ----------------
ECDICT_URL = "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.mini.csv"
ECDICT_TAGS = {"cet6": ["cet6"], "ielts": ["ielts"]}
JOB_KEYWORDS = ["工作", "公司", "职业", "管理", "职位", "项目", "团队", "面试", "商业", "市场", "销售",
                "客户", "文件", "报告", "会议", "计划", "招聘", "简历", "办公", "营销", "金融", "经济",
                "财务", "贸易", "谈判", "决策", "效率", "合作", "培训", "部门"]


def _ecdict_by_tags(want_tags, limit):
    """流式下载 ECDICT mini（CSV，字段含逗号需 csv 模块解析），按 tag 标签过滤"""
    out = []
    try:
        req = urllib.request.Request(ECDICT_URL, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=240) as r:
            text = io.TextIOWrapper(r, encoding="utf-8", errors="ignore")
            reader = csv.reader(text)
            try:
                next(reader)  # 跳过表头
            except StopIteration:
                return out
            for parts in reader:
                if len(parts) < 8:
                    continue
                tags = re.split(r"[\s,]+", (parts[7] or "").strip().lower())
                if not any(t in want_tags for t in tags):
                    continue
                w = (parts[0] or "").strip().lower()
                if not w or len(w) > 40:
                    continue
                m = (parts[3] or "").strip()
                p = (parts[1] or "").strip()
                if p:
                    p = "/%s/" % p
                out.append({"w": w, "p": p, "m": m})
                if len(out) >= limit:
                    break
    except Exception:
        pass
    return out


def refresh_word_bank(bank_id, existing, limit=2000):
    """词库 < 500 词时从 ECDICT 拉取扩充；返回新列表"""
    if len(existing) >= 500:
        return existing
    entries = _ecdict_by_tags(ECDICT_TAGS.get(bank_id, []), limit)
    if len(entries) < 300:
        return existing
    return entries


def derive_job_bank(cet6, ielts, existing, limit=1500):
    """求职词库 = 现有 + 六级/雅思中与职场相关的词"""
    if len(existing) >= 500:
        return existing
    out = list(existing)
    seen = {e["w"].lower() for e in out}
    for bank in (cet6, ielts):
        for e in bank:
            w = e["w"].lower()
            if w in seen:
                continue
            if any(k in e["m"] for k in JOB_KEYWORDS):
                out.append(e)
                seen.add(w)
    return out[:limit]


# ---------------- 新概念原创课文 ----------------
VOCAB_POOL = [
    {"w": "valuable", "p": "/ˈvæljuəbl/", "m": "adj. 宝贵的"},
    {"w": "advice", "p": "/ədˈvaɪs/", "m": "n. 建议"},
    {"w": "journey", "p": "/ˈdʒɜːni/", "m": "n. 旅程"},
    {"w": "balance", "p": "/ˈbæləns/", "m": "n. 平衡"},
    {"w": "curiosity", "p": "/ˌkjʊəriˈɒsəti/", "m": "n. 好奇心"},
    {"w": "habit", "p": "/ˈhæbɪt/", "m": "n. 习惯"},
    {"w": "patience", "p": "/ˈpeɪʃns/", "m": "n. 耐心"},
    {"w": "achieve", "p": "/əˈtʃiːv/", "m": "v. 达成"},
    {"w": "improve", "p": "/ɪmˈpruːv/", "m": "v. 改善"},
    {"w": "decision", "p": "/dɪˈsɪʒn/", "m": "n. 决定"},
    {"w": "strength", "p": "/streŋθ/", "m": "n. 力量"},
    {"w": "mind", "p": "/maɪnd/", "m": "n. 头脑；心灵"},
]


def generate_nce_lesson(seed):
    """根据日期种子确定性生成一篇原创课文"""
    rng = random.Random(seed)
    slots = {k: v[rng.randrange(len(v))] for k, v in NCE_WORD_POOL.items()}
    idxs = list(range(len(NCE_TEMPLATES)))
    rng.shuffle(idxs)
    picked = idxs[:5]
    en_paras, cn_paras = [], []
    for i in sorted(picked):
        en, cn = NCE_TEMPLATES[i]
        en_paras.append(en.format(**slots))
        cn_paras.append(cn.format(**slots))
    vocab = rng.sample(VOCAB_POOL, 6)
    title = "Lesson: " + slots["rule"].split(" ")[0].capitalize() + " Day by Day"
    return {"title": title, "en": en_paras, "cn": cn_paras, "words": vocab}


# ---------------- 公版书全文 ----------------
BOOK_WIKI = {
    "lunyu": "論語",
    "daodejing": "道德經",
    "sunzi": "孫子兵法",
    "caigentan": "菜根譚",
    "xiaochuang": "小窗幽記",
    "weilu": "圍爐夜話",
}
BOOK_FALLBACK = {
    "lunyu": ["https://raw.githubusercontent.com/zhengxiaoyang/ConfuciusAnalects/master/lunyu.txt"],
    "daodejing": [],
    "sunzi": [],
    "caigentan": [],
    "xiaochuang": [],
    "weilu": [],
}


def _clean_wiki(text):
    """把维基源码清洗成可读正文段落"""
    lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if line.startswith("{{") and not line.startswith("{{章"):
            continue
        if line.startswith("}}"):
            continue
        line = re.sub(r"\[\[[^|\]]*\|([^\]]+)\]\]", r"\1", line)
        line = re.sub(r"\[\[([^\]]+)\]\]", r"\1", line)
        line = re.sub(r"<ref[^>]*>.*?</ref>", "", line)
        line = re.sub(r"<!--.*?-->", "", line)
        line = line.replace("'''", "").replace("''", "")
        if line.startswith("==") and line.endswith("=="):
            lines.append("##TITLE##" + line.strip("= ").strip())
        elif line.startswith("=") and line.endswith("=") and len(line) < 30:
            lines.append("##TITLE##" + line.strip("= ").strip())
        elif line:
            lines.append(line)
    return lines


def fetch_book(book_id, meta):
    """抓取并分章，返回 chapters 列表；失败返回 None"""
    text = None
    page = BOOK_WIKI.get(book_id)
    if page:
        try:
            text = http_get("https://zh.wikisource.org/wiki/%s?action=raw" % page, timeout=40)
        except Exception:
            text = None
    if not text:
        for url in BOOK_FALLBACK.get(book_id, []):
            try:
                text = http_get(url, timeout=40)
                break
            except Exception:
                continue
    if not text or len(text) < 500:
        return None
    lines = _clean_wiki(text)
    chapters = []
    cur = {"title": "前言", "paras": []}
    for ln in lines:
        if ln.startswith("##TITLE##"):
            if cur["paras"]:
                chapters.append(cur)
            cur = {"title": ln[len("##TITLE##"):], "paras": []}
        elif ln:
            cur["paras"].append(ln)
    if cur["paras"]:
        chapters.append(cur)
    cleaned = []
    for ch in chapters:
        paras = [p for p in ch["paras"] if len(p) >= 2]
        if not paras:
            continue
        if len(ch["title"]) > 20:
            paras = [ch["title"]] + paras
            ch["title"] = "章节"
        cleaned.append({"title": ch["title"], "paras": paras})
    if not cleaned:
        return None
    return cleaned


# ---------------- 爆款脚本生成 ----------------
SHOT_SHOTS = ["全景", "中景", "近景", "特写", "大特写", "远景"]
SHOT_CAMERAS = ["固定机位", "手持跟拍", "推镜", "拉镜", "环绕运镜", "慢镜头", "俯拍", "延时"]
SHOT_MUSIC = ["轻快BGM", "紧张鼓点", "温暖吉他", "激昂弦乐", "低沉钢琴", "欢快收尾", "悬念音效", "温情配乐"]
HOOKS = [
    "结尾黑屏字幕：看到最后，你会发现不一样的世界。评论区说说你的想法。",
    "片尾字幕：生活是最好的剧本。点赞收藏，下期更精彩。",
    "结尾反转：原来一切早有伏笔。转发给朋友，看看他们猜到没有。",
    "片尾字幕：坚持的人，终将被看见。关注我，每天一个真实故事。",
    "结尾提问：如果是你，你会怎么选？评论区见。",
    "片尾字幕：认真生活的人，运气都不会太差。",
]
ROLE_NAMES = ["主角", "好友", "老板", "陌生人", "家人", "同事"]
ROLE_DESC = ["性格鲜明，目标明确", "关键时刻提供帮助", "制造冲突，推动剧情", "带来反转的关键人物", "情感线的核心", "引出主题的配角"]


def make_script(video, idx, day_index):
    rng = random.Random(day_index * 100 + idx * 7)
    topic = (video.get("title") or "生活").strip()
    n_roles = rng.randint(2, 3)
    roles = []
    used = set()
    for i in range(n_roles):
        nm = ROLE_NAMES[(idx + i * 3) % len(ROLE_NAMES)]
        if nm in used:
            nm = "配角" + str(i)
        used.add(nm)
        roles.append({"name": nm, "desc": ROLE_DESC[(idx + i * 5) % len(ROLE_DESC)]})
    n_scenes = rng.randint(2, 3)
    scenes = []
    for s in range(n_scenes):
        setting = rng.choice(["熟悉的街角", "明亮的办公室", "温馨的家里", "人来人往的广场", "安静的咖啡馆", "深夜的路边摊"])
        n_shots = rng.randint(2, 4)
        shots = []
        for j in range(n_shots):
            shots.append({
                "shot": rng.choice(SHOT_SHOTS),
                "camera": rng.choice(SHOT_CAMERAS),
                "subtitle": rng.choice([
                    "镜头慢慢拉近，气氛开始变化",
                    "一句台词，让所有人愣住",
                    "转折发生，情绪推向高潮",
                    "画面定格，悬念拉满",
                    "细节特写，暗示真相",
                    "主人公下定决心，转身离开",
                ]),
                "music": rng.choice(SHOT_MUSIC),
            })
        scenes.append({"setting": setting, "shots": shots})
    return {
        "concept": "围绕「%s」主题，用真实感 + 反转为核心，前三秒用悬念抓住观众，结尾留下互动话题。" % topic,
        "roles": roles,
        "scenes": scenes,
        "hook": HOOKS[day_index % len(HOOKS)],
    }
