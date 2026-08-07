# -*- coding: utf-8 -*-
"""probe_books4.py —— 直接用 fetch_book 真实抓取候选书，输出章节数（决定性测试）"""
import sys, time, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content

tests = [
    ("sanguo", "三國演義"), ("xiyou", "西遊記"), ("shuihu", "水滸傳"), ("honglou", "紅樓夢"),
    ("aijiaoyu", "愛的教育"), ("yisuo", "伊索寓言"), ("heinu", "黑奴籲天錄"),
    ("chahuanv", "巴黎茶花女遺事"), ("panghuang", "彷徨"), ("gushixinbian", "故事新編"),
    ("yueyaer", "月牙兒"), ("yecao", "野艸"), ("chunshui", "春水"), ("zhimodeshi", "志摩的詩"),
]
for bid, page in tests:
    try:
        ch = content.fetch_book(bid, {"title": page})
        print("FETCH|%s|%s|chapters=%d" % (bid, page, len(ch) if ch else 0))
    except Exception as e:
        print("FETCHERR|%s|%s|%s" % (bid, page, str(e)[:140]))
    time.sleep(1.2)