# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""daily.py —— 每日自动更新主流程（GitHub Actions 每天定时执行，无需人工操作）"""
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import content
import douyin
from pools import (CREATION_DRAMA_TOPICS, CREATION_SCRIPT_TOPICS, FITNESS_TOPICS,
                   FOOD_KEYWORDS, NCE_TEMPLATES, ORAL_EXTRA, QUOTES_EXTRA, RECIPES_EXTRA)

TZ = timezone(timedelta(hours=8))
EPOCH = date(2026, 1, 1)
REPO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
DATA = REPO / "docs" / "data"


def load(rel, default):
    p = DATA / rel
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8-sig"))
        except Exception:
            return default
    return default


def save(rel, obj):
    p = DATA / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def dedupe(items, key):
    seen, out = set(), []
    for it in items:
        k = key(it)
        if k in seen:
            continue
        seen.add(k)
        out.append(it)
    return out


def main():
    now = datetime.now(TZ)
    today = now.strftime("%Y-%m-%d")
    day_index = (now.date() - EPOCH).days
    cookie = os.environ.get("DOUYIN_COOKIE", "")
    summary = []

    # 抖音热榜（失败自动降级）
    hot = []
    try:
        hot = douyin.hot_words(cookie)
    except Exception:
        hot = []
    summary.append("热榜关键词: %d" % len(hot))

    # 1) 健身训练视频（6 部位 × 3 条）
    try:
        parts = {}
        for pid, topics in FITNESS_TOPICS.items():
            parts[pid] = douyin.get_videos(topics, 3, day_index + hash(pid) % 5, cookie, hot)
        save("fitness/videos.json", {"updated": today, "parts": parts})
        summary.append("健身视频已更新")
    except Exception as e:
        summary.append("健身视频更新失败（下次自动重试）：%s" % e)

    # 2) 创作：AI 漫剧 6 条 + 爆款脚本 10 套
    try:
        drama = douyin.get_videos(CREATION_DRAMA_TOPICS, 6, day_index, cookie, hot)
        scripts_raw = douyin.get_videos(CREATION_SCRIPT_TOPICS, 10, day_index + 3, cookie, hot, blend_hot=True)
        scripts = []
        for i, v in enumerate(scripts_raw):
            scripts.append(dict(v, topic=v.get("title", ""), script=content.make_script(v, i, day_index)))
        save("creation.json", {"updated": today, "drama": drama[:6], "scripts": scripts[:10]})
        summary.append("创作板块已更新（漫剧%d条 脚本%d套）" % (len(drama[:6]), len(scripts[:10])))
    except Exception as e:
        summary.append("创作板块更新失败（下次自动重试）：%s" % e)

    # 4) 菜谱：每日 3 道（川粤湘东北江浙等多菜系轮换），历史保留最近 12 道
    base = load("recipes/recipes.json", {}).get("recipes", [])
    for r in base:
        r.setdefault("cuisine", "川菜")
    pool = dedupe(base + RECIPES_EXTRA, lambda r: r.get("title", ""))
    picked = []
    if pool:
        n = len(pool)
        start = day_index * 3 % n
        for i in range(3):
            r = pool[(start + i) % n]
            title = r.get("title", "家常菜")
            r = dict(r)
            r["video"] = {
                "title": title + "做法",
                "url": "https://www.douyin.com/search/" + title + "%20做法?type=video",
            }
            picked.append(r)
    prev = [dict(r) for r in base if r.get("title") not in {p.get("title") for p in picked}]
    recipes = picked + prev[:9]
    save("recipes/recipes.json", {"updated": today, "recipes": recipes[:12]})
    summary.append("菜谱已更新（今日新增%d道）" % len(picked))

    # 5) 英语词库：不足时自动扩充（六级/雅思/求职）
    cet6 = load("words/cet6.json", [])
    ielts = load("words/ielts.json", [])
    job = load("words/job.json", [])
    try:
        cet6_new = content.refresh_word_bank("cet6", cet6)
        ielts_new = content.refresh_word_bank("ielts", ielts)
        job_new = content.derive_job_bank(cet6_new, ielts_new, job)
        if cet6_new != cet6 or ielts_new != ielts or job_new != job:
            save("words/cet6.json", cet6_new)
            save("words/ielts.json", ielts_new)
            save("words/job.json", job_new)
            summary.append("词库扩充（六级%d 雅思%d 求职%d）" % (len(cet6_new), len(ielts_new), len(job_new)))
        else:
            summary.append("词库充足，无需更新（六级%d 雅思%d 求职%d）" % (len(cet6), len(ielts), len(job)))
    except Exception as e:
        summary.append("词库更新失败（下次自动重试）：%s" % e)

    # 6) 场景口语：合并扩充池（每周轮换展示）
    oral = load("oral.json", {})
    scenarios = dedupe(oral.get("scenarios", []) + ORAL_EXTRA, lambda s: s.get("id", ""))
    save("oral.json", {"updated": today, "scenarios": scenarios[:24]})

    # 7) 新概念：每周生成一篇新原创课文
    nce = load("nce.json", {})
    lessons = nce.get("lessons", [])
    last_added = nce.get("lastAdded", "")
    if not last_added or (now.date() - date.fromisoformat(last_added)).days >= 7:
        lesson = content.generate_nce_lesson(day_index // 7)
        lesson["id"] = "nce-" + today.replace("-", "")
        lessons.append(lesson)
        lessons = lessons[-30:]
        nce = {"updated": today, "lastAdded": today, "lessons": lessons}
        save("nce.json", nce)
        summary.append("新概念新增课文一篇")
    else:
        nce["updated"] = today
        save("nce.json", nce)

    # 8) 金句：扩充池合并
    quotes = load("quotes.json", [])
    quotes = dedupe(quotes + QUOTES_EXTRA, lambda q: q.get("text", ""))[:200]
    save("quotes.json", quotes)

    # 9) 书籍：全文缺失时自动补抓（公版书，来自维基文库等公开源）
    books_index = load("books/index.json", [])
    for b in books_index:
        bid = b.get("id", "")
        if not bid:
            continue
        if not (DATA / "books" / (bid + ".json")).exists():
            try:
                chapters_text = content.fetch_book(bid, b)
            except Exception as e:
                chapters_text = None
                summary.append("书籍抓取异常（下次自动重试）：%s %s" % (b.get("title", bid), e))
            if chapters_text:
                save("books/%s.json" % bid, {"id": bid, "title": b.get("title", ""), "author": b.get("author", ""), "chapters": chapters_text})
                summary.append("书籍全文已抓取：%s" % b.get("title", bid))
            else:
                summary.append("书籍抓取失败（下次自动重试）：%s" % b.get("title", bid))

    # 10) 播客：仅刷新日期
    pods = load("podcasts.json", {})
    pods["updated"] = today
    save("podcasts.json", pods)

    # 11) 首页与全局索引
    home = load("home.json", {})
    home["updated"] = today
    save("home.json", home)
    save("index.json", {"updated": today, "note": "数据由 GitHub Actions 每日自动更新"})
    save("meta/feed.json", {"date": today, "last_run": now.isoformat(), "hot_words": len(hot)})

    print("=" * 40)
    print("每日更新完成:", today)
    for line in summary:
        print(" -", line)
    print("=" * 40)


if __name__ == "__main__":
    main()



