# -*- coding: utf-8 -*-
"""pools.py —— 内容池：抖音话题、菜谱、口语、金句、课文模板（兜底 + 轮换用）"""

# 抖音热搜接口失败时，用这些话题轮换，保证每天内容不重样
FITNESS_TOPICS = {
    "chest": ["胸肌训练", "俯卧撑教学", "哑铃卧推", "上胸训练", "居家练胸"],
    "back": ["背部训练", "引体向上", "高位下拉", "改善驼背", "背阔肌"],
    "legs": ["腿部训练", "深蹲教学", "居家练腿", "腿部拉伸", "跑步膝"],
    "shoulders": ["肩部训练", "侧平举", "直角肩", "肩袖热身", "肩膀塑形"],
    "abs": ["腹肌训练", "核心力量", "平板支撑", "瘦腰腹", "卷腹"],
    "full": ["全身燃脂", "HIIT训练", "居家全身训练", "晨间拉伸", "徒手训练"],
}
CREATION_DRAMA_TOPICS = ["漫剧推荐", "热血漫剧", "甜宠漫剧", "漫剧解说", "国漫推荐", "重生漫剧"]
CREATION_SCRIPT_TOPICS = ["爆款短视频", "剧情反转", "情感故事", "职场故事", "创业故事", "生活记录", "搞笑剧情", "励志故事", "家庭温情", "旅行故事"]
STUDY_TOPICS = {
    "stats": ["统计学入门", "数据分析基础", "假设检验", "正态分布"],
    "excel": ["Excel技巧", "数据透视表", "VLOOKUP", "Excel图表"],
    "sql": ["SQL教程", "数据库入门", "SQL面试", "窗口函数"],
    "python": ["Python数据分析", "Pandas教程", "数据清洗", "Python爬虫"],
    "viz": ["数据可视化", "图表设计", "Matplotlib", "仪表盘"],
    "ml": ["机器学习入门", "AI教程", "线性回归", "深度学习"],
}
FOOD_KEYWORDS = ["川菜家常菜", "麻婆豆腐", "回锅肉", "水煮鱼", "宫保鸡丁", "川菜做法", "下饭菜"]

# 额外菜谱池（与内置 10 道合并，共 25+ 道，每日轮换 3 道）
RECIPES_EXTRA = [
    {"title":"水煮肉片","time":"30分钟","difficulty":"中等","tags":["硬菜","麻辣"],"ingredients":["猪里脊 300g","豆芽 200g","豆瓣酱 2勺","干辣椒 花椒","蛋清 1个","淀粉 料酒","姜蒜 香菜"],"steps":["里脊切薄片，加盐、料酒、蛋清、淀粉上浆腌15分钟。","豆芽焯水垫碗底。","热油炒香豆瓣酱、姜蒜，加水烧开，下肉片滑散煮至变色。","连汤倒入碗中，铺干辣椒花椒，淋热油激香，撒香菜。"],"tips":"肉片下锅后轻轻推散，煮到变色就关火，肉才嫩。"},
    {"title":"毛血旺","time":"40分钟","difficulty":"进阶","tags":["硬菜","麻辣"],"ingredients":["鸭血 400g","毛肚 200g","午餐肉 半盒","豆芽 黄豆芽","豆瓣酱 2勺","火锅底料 1小块","干辣椒 花椒","姜蒜"],"steps":["鸭血切块焯水，毛肚洗净切条。","热油炒豆瓣酱和火锅底料，加姜蒜炒出红油，倒开水煮开。","下豆芽煮1分钟捞出垫底，再下鸭血、午餐肉煮3分钟。","最后下毛肚烫20秒，连汤倒出，铺辣椒花椒淋热油。"],"tips":"毛肚一定最后下、快烫，久煮会老得像橡皮。"},
    {"title":"麻辣香锅","time":"25分钟","difficulty":"中等","tags":["快手","麻辣"],"ingredients":["虾 8只","午餐肉 半盒","土豆 1个","莲藕 1节","花菜 半颗","麻辣香锅底料 1包","干辣椒 花椒","白芝麻 香菜"],"steps":["所有蔬菜切块，虾开背去虾线。","土豆、莲藕、花菜焯水8成熟。","热油下底料炒香，先下虾煎至变色。","下所有食材大火翻炒均匀，撒白芝麻香菜出锅。"],"tips":"食材要沥干水分再下锅，才能挂上料香而不水。"},
    {"title":"蒜泥白肉","time":"30分钟","difficulty":"简单","tags":["凉菜","蒜香"],"ingredients":["五花肉 400g","蒜 1头","姜 葱 料酒","生抽 2勺","辣椒油 2勺","白糖 少许","黄瓜 1根"],"steps":["五花肉冷水下锅加姜葱料酒，煮25分钟至熟透，捞出晾凉。","蒜捣成泥，加生抽、辣椒油、白糖、少许煮肉汤调成蒜泥汁。","黄瓜切薄片垫盘，肉切薄片码上。","淋上蒜泥汁即可。"],"tips":"肉要晾凉再切，越薄越好吃；蒜泥现捣才够味。"},
    {"title":"口水鸡","time":"40分钟","difficulty":"中等","tags":["凉菜","麻辣"],"ingredients":["鸡腿 2个","花生碎 50g","辣椒油 3勺","花椒粉 1勺","生抽 醋 白糖","姜葱 料酒","熟白芝麻"],"steps":["鸡腿冷水下锅加姜葱料酒，煮15分钟关火焖10分钟，捞出冰水浸泡。","调汁：辣椒油+生抽+醋+白糖+花椒粉+2勺鸡汤搅匀。","鸡腿斩块码盘，淋上料汁。","撒花生碎、白芝麻和葱花。"],"tips":"煮好后过冰水，鸡皮才爽脆弹牙。"},
    {"title":"酸辣粉","time":"15分钟","difficulty":"简单","tags":["快手","酸辣"],"ingredients":["红薯粉 150g","花生米 30g","榨菜 20g","辣椒油 2勺","陈醋 3勺","生抽 1勺","蒜末 香菜"],"steps":["红薯粉温水泡软，煮3分钟捞出过凉。","碗底放辣椒油、陈醋、生抽、蒜末、少许盐和糖。","加两勺滚烫的高汤或开水冲开料汁。","放入粉条，加榨菜、花生米、香菜。"],"tips":"陈醋出锅前再加，酸味才留得住。"},
    {"title":"担担面","time":"15分钟","difficulty":"简单","tags":["快手","麻辣"],"ingredients":["细面条 200g","猪肉末 80g","芽菜 30g","辣椒油 2勺","花椒粉 半勺","生抽 醋 蒜末","葱花 花生碎"],"steps":["热油煸炒肉末至酥香，加入芽菜炒匀成臊子。","碗底调辣椒油、生抽、醋、花椒粉、蒜末。","面条煮熟捞出放入碗中，浇上臊子和一勺面汤。","撒葱花、花生碎拌匀开吃。"],"tips":"芽菜是灵魂，没有可以用碎米芽菜代替；面条别煮太软。"},
    {"title":"川北凉粉","time":"20分钟","difficulty":"简单","tags":["凉菜","爽口"],"ingredients":["凉粉 400g","辣椒油 3勺","花椒粉 半勺","生抽 2勺","醋 1勺","蒜泥","葱花 花生碎"],"steps":["凉粉切成条或片，装盘。","调汁：辣椒油+生抽+醋+花椒粉+蒜泥+少许白糖。","将料汁淋在凉粉上。","撒葱花和花生碎即可。"],"tips":"凉粉买回来先放冰箱冰一会儿，口感更爽。"},
    {"title":"鱼香茄子","time":"20分钟","difficulty":"简单","tags":["下饭","酸甜"],"ingredients":["长茄子 2根","蒜末 姜末 葱花","泡椒末 2勺","生抽 醋 白糖 淀粉"],"steps":["茄子切条，撒盐腌10分钟挤干水分，或裹薄淀粉。","调鱼香汁：生抽2勺+醋3勺+糖2勺+淀粉1勺+水3勺。","多油把茄条煎软至微焦，盛出。","底油炒香泡椒、蒜姜末，倒回茄条，淋汁大火收浓，撒葱花。"],"tips":"茄子先腌出水再煎，吸油少、更入味。"},
    {"title":"虎皮青椒","time":"15分钟","difficulty":"简单","tags":["素菜","下饭"],"ingredients":["青椒 6个","蒜末","生抽 2勺","醋 1勺","白糖 1勺","豆豉 1小勺"],"steps":["青椒去蒂洗净，用厨房纸吸干水分。","锅烧热不放油，下青椒煸至两面起虎皮斑，压一压。","淋少许油，下蒜末豆豉炒香。","加生抽、醋、白糖，翻炒入味出锅。"],"tips":"煸青椒时不放油，虎皮才明显；出锅前再调味汁。"},
    {"title":"孜然牛肉","time":"20分钟","difficulty":"中等","tags":["下饭","干香"],"ingredients":["牛里脊 300g","孜然粒 2勺","辣椒粉 1勺","白芝麻 洋葱 青椒","生抽 料酒 淀粉"],"steps":["牛肉逆纹切薄片，加生抽、料酒、淀粉腌15分钟。","热油大火快炒牛肉至变色盛出。","下洋葱青椒炒香，倒回牛肉。","加孜然粒、辣椒粉、白芝麻翻炒均匀出锅。"],"tips":"牛肉要逆着纹路切、大火快炒，才嫩不柴。"},
    {"title":"火爆腰花","time":"20分钟","difficulty":"进阶","tags":["下饭","脆嫩"],"ingredients":["猪腰 2个","泡椒 5个","姜蒜 葱段","生抽 醋 料酒 淀粉","白糖"],"steps":["猪腰去筋膜，打十字花刀切块，用料酒、淀粉抓匀。","调碗汁：生抽+醋+糖+淀粉+少许水。","油烧到冒烟，下腰花大火爆炒20秒至卷起。","下泡椒姜蒜葱段炒香，淋碗汁大火收汁出锅。"],"tips":"腰花要大火快炒，时间长了就老了；去腥靠料酒和泡椒。"},
    {"title":"东坡肘子（川式）","time":"120分钟","difficulty":"进阶","tags":["硬菜","宴客"],"ingredients":["猪肘 1个","冰糖 30g","豆瓣酱 2勺","生抽 老抽 料酒","姜葱 八角 桂皮","花椒"],"steps":["肘子焯水去血沫，表面抹老抽上色。","热油炒冰糖至枣红色，下肘子裹糖色。","加豆瓣酱、香料、姜葱和开水，没过肘子，小火炖90分钟。","大火收汁至浓稠，摆盘淋汁。"],"tips":"炖的时候中途翻一次面，皮朝下更易入味。"},
    {"title":"开水白菜","time":"60分钟","difficulty":"进阶","tags":["名菜","清淡"],"ingredients":["娃娃菜 1颗","鸡胸肉 200g","猪骨 300g","姜葱 料酒","盐 白胡椒"],"steps":["猪骨和鸡架熬出清汤，滤去杂质。","鸡胸肉剁成蓉，分次下入微沸的汤中，搅动后捞出肉渣，重复两次使汤变清。","娃娃菜焯水后放入清汤中蒸10分钟。","加盐和白胡椒调味，盛碗。"],"tips":"‘开水’其实是极清澈的高汤；吊汤是川菜功夫活，耐心最重要。"},
    {"title":"宫保虾球","time":"20分钟","difficulty":"中等","tags":["海鲜","微辣"],"ingredients":["大虾 300g","花生米 50g","干辣椒 8个","花椒 1小把","葱段 蒜片","生抽 醋 白糖 淀粉"],"steps":["大虾去壳开背去虾线，加盐料酒淀粉抓匀。","冷油小火炸香花生米捞出。","热油下干辣椒花椒炒香，下虾仁炒至变色卷成球。","加葱蒜爆香，倒入糖醋碗汁收浓，拌入花生米。"],"tips":"虾仁开背要深一点，受热才能卷成漂亮的虾球。"},
]

# 额外口语场景池（与内置 8 个合并，共 16 个，每周轮换）
ORAL_EXTRA = [
    {"id":"bank","title":"银行开户","scene":"去银行办理一张储蓄卡。","lines":[{"spk":"A","en":"Good afternoon. How can I help you?","cn":"下午好，请问需要办理什么业务？"},{"spk":"B","en":"I'd like to open a savings account.","cn":"我想开一个储蓄账户。"},{"spk":"A","en":"May I see your ID card, please?","cn":"请出示您的身份证。"},{"spk":"B","en":"Here it is. What documents do I need?","cn":"给您。还需要什么材料吗？"},{"spk":"A","en":"Just your phone number. Please set a six-digit password.","cn":"再留个手机号，并设置六位密码。"},{"spk":"B","en":"Done. How long will it take?","cn":"好了。大概要多久？"},{"spk":"A","en":"About ten minutes. Here's your card.","cn":"大约十分钟。这是您的卡。"}],"tips":"银行常用：open an account（开户）、savings account（储蓄账户）、password（密码）。"},
    {"id":"taxi","title":"打车去机场","scene":"在路边打了一辆出租车去机场。","lines":[{"spk":"A","en":"Where are you heading?","cn":"您要去哪儿？"},{"spk":"B","en":"The airport, please. I'm in a hurry.","cn":"去机场，我赶时间。"},{"spk":"A","en":"No problem. The traffic is fine at this hour.","cn":"没问题，这个点路况不错。"},{"spk":"B","en":"How long will it take?","cn":"大概要多久？"},{"spk":"A","en":"About twenty-five minutes.","cn":"大约25分钟。"},{"spk":"B","en":"Could you please turn up the air conditioner?","cn":"能麻烦把空调开大一点吗？"},{"spk":"A","en":"Sure. We're almost there.","cn":"好的。我们快到了。"}],"tips":"打车常用：I'm in a hurry（我赶时间）、turn up（调大）。"},
    {"id":"gym","title":"健身房办卡","scene":"在健身房咨询会员卡。","lines":[{"spk":"A","en":"Welcome! Are you interested in a membership?","cn":"欢迎光临！想了解会员卡吗？"},{"spk":"B","en":"Yes. How much is a monthly pass?","cn":"是的，月卡多少钱？"},{"spk":"A","en":"Two hundred yuan per month, or eighteen hundred a year.","cn":"月卡200元，年卡1800元。"},{"spk":"B","en":"What facilities do you have?","cn":"你们都有什么设施？"},{"spk":"A","en":"We have a full gym, a swimming pool, and yoga classes.","cn":"全套器械、游泳池和瑜伽课。"},{"spk":"B","en":"Sounds good. I'll take the yearly plan.","cn":"听起来不错，我办年卡。"}],"tips":"健身常用：membership（会员）、facilities（设施）、yoga（瑜伽）。"},
    {"id":"reserve","title":"打电话订座","scene":"给餐厅打电话预订周末的位子。","lines":[{"spk":"A","en":"Hello, this is Green Garden Restaurant.","cn":"您好，这里是绿园餐厅。"},{"spk":"B","en":"Hi, I'd like to book a table for Saturday night.","cn":"你好，我想订周六晚上的位子。"},{"spk":"A","en":"For how many people?","cn":"几位用餐？"},{"spk":"B","en":"Four people, at seven o'clock.","cn":"四位，晚上7点。"},{"spk":"A","en":"May I have your name and phone number?","cn":"请留一下您的姓名和电话。"},{"spk":"B","en":"Sure, it's Xu, 138-0000-0000.","cn":"好的，我叫Xu，电话138-0000-0000。"},{"spk":"A","en":"All set. We'll keep the table for fifteen minutes.","cn":"订好了，我们会保留位子15分钟。"}],"tips":"订座常用：book a table（订位）、keep the table（留位）。"},
    {"id":"supermarket","title":"超市结账","scene":"在超市排队结账。","lines":[{"spk":"A","en":"Good evening. Did you find everything?","cn":"晚上好，都找到了吗？"},{"spk":"B","en":"Yes, thanks. I also have a coupon.","cn":"是的，谢谢。我有一张优惠券。"},{"spk":"A","en":"Sure, let me scan it. That will be eighty-six fifty.","cn":"好的，我扫一下。一共86块5。"},{"spk":"B","en":"Can I pay by mobile?","cn":"可以手机支付吗？"},{"spk":"A","en":"Of course. Please scan this QR code.","cn":"当然可以，请扫这个二维码。"},{"spk":"B","en":"Done. Have a nice evening!","cn":"付好了，祝你晚上愉快！"}],"tips":"超市常用：coupon（优惠券）、pay by mobile（手机支付）、QR code（二维码）。"},
    {"id":"barber","title":"理发","scene":"去理发店剪头发。","lines":[{"spk":"A","en":"How would you like your hair cut?","cn":"您想怎么剪？"},{"spk":"B","en":"Just a trim, and shorter on the sides.","cn":"稍微修一下，两边剪短一点。"},{"spk":"A","en":"How about the top?","cn":"头顶呢？"},{"spk":"B","en":"Keep the top a bit longer, please.","cn":"头顶留长一点。"},{"spk":"A","en":"Do you want a wash first?","cn":"要先洗个头吗？"},{"spk":"B","en":"Yes, please.","cn":"好的。"},{"spk":"A","en":"All done. How does it look?","cn":"剪好了，您看怎么样？"}],"tips":"理发常用：a trim（修剪）、shorter on the sides（两边剪短）。"},
    {"id":"library","title":"图书馆借书","scene":"在图书馆借阅一本书。","lines":[{"spk":"A","en":"Excuse me, how do I borrow a book?","cn":"打扰一下，请问怎么借书？"},{"spk":"B","en":"You need a library card. Do you have one?","cn":"需要借书卡，您有吗？"},{"spk":"A","en":"Yes, here it is. I'd like to borrow this novel.","cn":"有，给您。我想借这本小说。"},{"spk":"B","en":"It's due in two weeks. You can renew it online.","cn":"两周后到期，可以在网上续借。"},{"spk":"A","en":"What if I return it late?","cn":"如果逾期还书会怎样？"},{"spk":"B","en":"There's a small fine of fifty cents a day.","cn":"每天五毛钱的小额罚款。"},{"spk":"A","en":"Got it, thanks!","cn":"明白了，谢谢！"}],"tips":"图书馆常用：borrow（借）、due（到期）、renew（续借）、fine（罚款）。"},
    {"id":"neighbor","title":"和新邻居打招呼","scene":"搬家后第一次见到邻居。","lines":[{"spk":"A","en":"Hi, you must be the new neighbor!","cn":"你好，你就是新邻居吧！"},{"spk":"B","en":"Hi! I just moved in yesterday.","cn":"你好！我昨天刚搬来。"},{"spk":"A","en":"Welcome! I'm Li, from next door.","cn":"欢迎！我是隔壁的小李。"},{"spk":"B","en":"Nice to meet you. I'm Xu.","cn":"很高兴认识你，我叫Xu。"},{"spk":"A","en":"If you need anything, just knock on my door.","cn":"有什么需要帮忙的，随时敲门。"},{"spk":"B","en":"That's so kind. Thanks a lot!","cn":"你太好了，非常感谢！"}],"tips":"邻居寒暄常用：just moved in（刚搬来）、knock on my door（来敲门找我）。"},
]

# 额外金句池（每周补充，保持金句持续更新）
QUOTES_EXTRA = [
    {"text":"每一个不起舞的日子，都是对生命的辜负。","author":"尼采"},
    {"text":"人生如逆旅，我亦是行人。","author":"苏轼"},
    {"text":"世界上只有一种真正的英雄主义，就是认清生活真相后依然热爱生活。","author":"罗曼·罗兰"},
    {"text":"你若盛开，蝴蝶自来。","author":""},
    {"text":"尽最大的努力，做最坏的打算，持最好的心态。","author":""},
    {"text":"种善因，得善果。","author":"佛家"},
    {"text":"所谓自由，不是随心所欲，而是自我主宰。","author":"康德"},
    {"text":"人的一切痛苦，本质上都是对自己无能的愤怒。","author":"王小波"},
    {"text":"生活不止眼前的苟且，还有诗和远方。","author":"高晓松"},
    {"text":"我们终此一生，就是要摆脱他人的期待，找到真正的自己。","author":"《无声告白》"},
    {"text":"越努力，越幸运。","author":""},
    {"text":"成功的路上并不拥挤，因为坚持的人不多。","author":""},
    {"text":"把简单的事情做好，就是不简单。","author":""},
    {"text":"你今天受的苦，吃的亏，担的责，到最后都会变成光，照亮你的路。","author":""},
    {"text":"读书是为了遇见更好的自己。","author":""},
    {"text":"人生没有白走的路，每一步都算数。","author":"李宗盛"},
    {"text":"内心丰盈者，独行也如众。","author":""},
    {"text":"真正的平静，不是避开车马喧嚣，而是在心中修篱种菊。","author":"林徽因"},
    {"text":"所有的大人都曾经是小孩，虽然只有少数人记得。","author":"《小王子》"},
    {"text":"愿你走出半生，归来仍是少年。","author":""},
    {"text":"会当凌绝顶，一览众山小。","author":"杜甫"},
    {"text":"长风破浪会有时，直挂云帆济沧海。","author":"李白"},
    {"text":"业精于勤，荒于嬉；行成于思，毁于随。","author":"韩愈"},
    {"text":"穷则独善其身，达则兼济天下。","author":"《孟子》"},
    {"text":"知之者不如好之者，好之者不如乐之者。","author":"孔子"},
    {"text":"问渠那得清如许？为有源头活水来。","author":"朱熹"},
    {"text":"海纳百川，有容乃大；壁立千仞，无欲则刚。","author":"林则徐"},
    {"text":"难得糊涂。","author":"郑板桥"},
    {"text":"世事洞明皆学问，人情练达即文章。","author":"曹雪芹"},
    {"text":"好看的皮囊千篇一律，有趣的灵魂万里挑一。","author":""},
    {"text":"你若安好，便是晴天。","author":""},
    {"text":"星光不问赶路人，时光不负有心人。","author":""},
    {"text":"以梦为马，不负韶华。","author":""},
    {"text":"凡是杀不死我的，必将使我更强大。","author":"尼采"},
    {"text":"一个人的格局，决定了他能走多远。","author":""},
    {"text":"耐心是一切聪明才智的基础。","author":"柏拉图"},
    {"text":"伟大是熬出来的。","author":"冯仑"},
    {"text":"所有的胜利，首先是意志的胜利。","author":""},
    {"text":"志不立，天下无可成之事。","author":"王阳明"},
    {"text":"慢慢变富，才是普通人最靠谱的路。","author":""},
]

# 新概念原创课文生成模板（每周围绕本周词汇生成一篇新课文）
NCE_TEMPLATES = [
    ("{name} gets up early and looks out of the window. The {weather} makes {name} smile.",
     "{name}早早起床，望向窗外。{weather_cn}让{name}露出了微笑。"),
    ("Every day, {name} follows the same simple rule: {rule}.",
     "每天，{name}都遵循同一条简单的准则：{rule_cn}。"),
    ("One afternoon, {name} met an old friend at the {place}.",
     "一天下午，{name}在{place_cn}遇到了一位老朋友。"),
    ("They talked about the {topic}, and the friend shared a valuable piece of advice.",
     "他们聊起了{topic_cn}，朋友分享了一条宝贵的建议。"),
    ("The advice was simple but powerful: \"{advice}\"",
     "那条建议简单却有力：“{advice_cn}”。"),
    ("From that day on, {name} started to {action} every morning.",
     "从那天起，{name}每天早上开始{action_cn}。"),
    ("It was not easy at first, but {name} never gave up.",
     "起初并不容易，但{name}从不放弃。"),
    ("Slowly, small changes began to appear in {name}'s life.",
     "慢慢地，小小的改变开始出现在{name}的生活里。"),
    ("At the end of the month, {name} looked back with a quiet sense of pride.",
     "月末，{name}带着一份平静的自豪回顾这个月。"),
    ("This is the power of small steps. Day by day, we become better versions of ourselves.",
     "这就是小步前进的力量。日复一日，我们成为更好的自己。"),
]
NCE_WORD_POOL = {
    "name": ["Xu", "Lily", "Tom", "Anna", "Mike"],
    "weather": ["fresh morning air", "gentle sunlight", "cool autumn wind", "warm spring rain"],
    "weather_cn": ["清新的空气", "柔和的阳光", "凉爽的秋风", "温暖的春雨"],
    "rule": ["finish the most important task first", "read for thirty minutes before bed", "exercise for one hour every day", "write down three things to be thankful for"],
    "rule_cn": ["先完成最重要的任务", "睡前阅读三十分钟", "每天运动一小时", "写下三件值得感恩的事"],
    "place": ["little café", "city library", "community park", "old bookstore"],
    "place_cn": ["小咖啡馆", "市图书馆", "社区公园", "旧书店"],
    "topic": ["study plan", "work-life balance", "new hobbies", "future dreams"],
    "topic_cn": ["学习计划", "工作与生活的平衡", "新爱好", "未来的梦想"],
    "advice": ["slow down and enjoy the journey", "never stop learning new things", "health always comes first", "stay curious and kind"],
    "advice_cn": ["慢下来，享受过程", "永远不要停止学习新事物", "健康永远第一", "保持好奇与善良"],
    "action": ["take a ten-minute walk", "practice English for twenty minutes", "cook a simple meal", "write in a journal"],
    "action_cn": ["散步十分钟", "练习英语二十分钟", "做一顿简单的饭", "写日记"],
}
