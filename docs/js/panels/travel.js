/* panels/travel.js —— 旅游：输入目的地自动生成简介 + 按天数行程 + 住宿/美食/游玩推荐 */
(function () {
  const XU = window.XU;
  const KEY = 'travel';

  /* ================= 目的地知识库 ================= */
  const D = {
    '大理': {
      intro: '大理是云南滇西的「风花雪月」之城：苍山十九峰横亘西侧，洱海如月牙环抱古城，白族村落与田园风光相映成趣。适合慢旅行、环湖骑行与发呆放空。',
      season: '3-5 月与 9-11 月最佳；夏季清凉避暑，冬季可看海鸥（11 月-次年 3 月）。',
      hotels: ['大理古城内（推荐「人民路」「复兴路」附近，晚上热闹）', '洱海海西生态廊道旁的湖景民宿（看日出最佳）', '双廊古镇（临海一线，适合住 1 晚）'],
      foods: ['酸辣鱼（洱海鱼+酸木瓜）', '大理烤乳扇', '喜洲粑粑（破酥）', '生皮（白族传统，需选干净店家）', '砂锅鱼', '雕梅、鲜花饼、三道茶'],
      spots: [
        { n: '洱海生态廊道', t: '骑行', d: '海西段风景最精华，租电瓶车或自行车环半圈' },
        { n: '大理古城', t: '人文', d: '五华楼、洋人街、人民路，晚上逛夜市' },
        { n: '苍山', t: '自然', d: '索道上山看洗马潭、玉带云游路' },
        { n: '喜洲古镇', t: '人文', d: '白族民居建筑群 + 稻田风光，吃喜洲粑粑' },
        { n: '双廊古镇', t: '休闲', d: '临海观景台与杨丽萍艺术空间（外观）' },
        { n: '崇圣寺三塔', t: '人文', d: '大理地标，塔影倒映在湖中很出片' },
        { n: '龙龛码头', t: '日出', d: '看洱海日出和红杉林的绝佳机位' },
        { n: '沙溪古镇', t: '小众', d: '茶马古道遗存，安静淳朴（需半天以上）' }
      ],
      days: {
        3: [
          ['抵达大理 → 入住古城附近，傍晚逛大理古城夜市，吃酸辣鱼'],
          ['洱海生态廊道骑行（龙龛→喜洲）→ 喜洲古镇 → 傍晚回古城'],
          ['苍山索道 → 崇圣寺三塔 → 下午返程或转站丽江']
        ],
        5: [
          ['抵达大理 → 古城漫步 → 五华楼看全景 → 晚上人民路'],
          ['洱海环湖东线：挖色 → 小普陀 → 双廊，宿双廊看日落'],
          ['双廊出发 → 喜洲古镇 + 海舌公园 → 回大理'],
          ['苍山索道 → 天龙八部影视城 → 傍晚洱海边看晚霞'],
          ['龙龛码头日出 → 崇圣寺三塔 → 采购伴手礼返程']
        ],
        7: [
          ['抵达大理 → 古城安顿 → 洋人街/人民路闲逛'],
          ['洱海生态廊道骑行：龙龛 → 喜洲（精华段）'],
          ['喜洲古镇 → 周城扎染体验 → 海舌公园'],
          ['苍山感通索道 → 玉带云游路徒步 → 寂照庵'],
          ['双廊一日：南诏风情岛 → 玉几岛 → 宿双廊'],
          ['沙溪古镇一日（或鸡足山/巍山古城）'],
          ['崇圣寺三塔 → 大理市集采购 → 返程']
        ]
      }
    },
    '成都': {
      intro: '成都是「天府之国」的烟火之城：美食遍地、节奏松弛、茶馆与熊猫是灵魂。适合逛吃、看熊猫、体验慢生活。',
      season: '3-6 月与 9-11 月气候舒适；7-8 月较热，可去青城山避暑。',
      hotels: ['春熙路/太古里商圈（交通美食最方便）', '宽窄巷子附近（老成都氛围）', '九眼桥/玉林路（夜生活丰富）'],
      foods: ['火锅（推荐微辣/鸳鸯锅）', '串串香', '夫妻肺片、口水鸡', '担担面、甜水面', '龙抄手、钟水饺', '三大炮、蛋烘糕、冰粉'],
      spots: [
        { n: '成都大熊猫繁育研究基地', t: '亲子', d: '早上 8 点前到人少，看滚滚吃竹子' },
        { n: '宽窄巷子', t: '人文', d: '清代古街区，喝茶看川剧变脸' },
        { n: '锦里 + 武侯祠', t: '人文', d: '三国文化 + 夜间灯笼很美' },
        { n: '人民公园鹤鸣茶社', t: '体验', d: '喝盖碗茶、掏耳朵，体验成都慢生活' },
        { n: '都江堰 + 青城山', t: '自然', d: '世界遗产一日游，道教仙山' },
        { n: '春熙路 / 太古里', t: '购物', d: 'IFS 熊猫爬墙打卡，潮牌聚集' },
        { n: '九眼桥 / 兰桂坊', t: '夜生活', d: '酒吧街，沿河夜景' },
        { n: '东郊记忆', t: '文艺', d: '工业风文创园区，拍照出片' }
      ],
      days: {
        3: [
          ['抵达成都 → 春熙路/太古里 → 晚上吃火锅'],
          ['大熊猫基地（上午）→ 宽窄巷子 → 人民公园喝茶 → 锦里夜游'],
          ['都江堰 → 青城山一日 → 晚上回市区吃串串']
        ],
        5: [
          ['抵达成都 → 太古里闲逛 → IFS 熊猫打卡 → 火锅晚餐'],
          ['大熊猫基地 → 东郊记忆 → 建设路小吃街'],
          ['都江堰 → 青城山一日游'],
          ['武侯祠 + 锦里 → 人民公园鹤鸣茶社 → 九眼桥夜景'],
          ['杜甫草堂 → 宽窄巷子采购伴手礼 → 返程']
        ],
        7: [
          ['抵达成都 → 太古里 → 春熙路夜市'],
          ['大熊猫基地 → 东郊记忆'],
          ['都江堰一日（含水利工程讲解）'],
          ['青城山前山 → 后山'],
          ['武侯祠 → 锦里 → 川剧变脸演出'],
          ['乐山大佛一日（高铁往返）或峨眉山'],
          ['人民公园喝茶 → 宽窄巷子采购 → 返程']
        ]
      }
    },
    '三亚': {
      intro: '三亚是中国的热带滨海度假胜地：碧海银沙、椰林海风，全年皆夏。适合游泳、潜水、亲子度假与躺平。',
      season: '11 月-次年 4 月最舒适；夏季注意防晒与台风（7-9 月）天气。',
      hotels: ['亚龙湾（沙滩水质最好，亲子首选）', '海棠湾（安静、近免税城，奢华酒店多）', '大东海/三亚湾（性价比高，近市区）'],
      foods: ['海鲜（第一市场/火车头市场现买现做）', '椰子鸡火锅', '文昌鸡、加积鸭', '抱罗粉、海南粉', '清补凉', '热带水果（芒果、莲雾、菠萝蜜）'],
      spots: [
        { n: '亚龙湾', t: '海滩', d: '沙质细软，海水清澈，适合游泳' },
        { n: '蜈支洲岛', t: '海岛', d: '潜水胜地，环岛电瓶车看海' },
        { n: '天涯海角', t: '地标', d: '巨石海岸线，拍照打卡' },
        { n: '南山文化旅游区', t: '人文', d: '108 米海上观音，庄严震撼' },
        { n: '大小洞天', t: '自然', d: '山海奇观，婚纱摄影圣地' },
        { n: '鹿回头山顶公园', t: '夜景', d: '俯瞰三亚湾日落与城市灯火' },
        { n: '后海村', t: '冲浪', d: '新手冲浪天堂，文艺渔村' },
        { n: '三亚国际免税城', t: '购物', d: '海棠湾，离岛免税购物' }
      ],
      days: {
        3: [
          ['抵达三亚 → 入住亚龙湾 → 海边踏浪看日落'],
          ['蜈支洲岛一日（潜水+环岛）'],
          ['南山观音 → 天涯海角 → 傍晚返程']
        ],
        5: [
          ['抵达 → 亚龙湾沙滩 → 晚上海鲜大餐'],
          ['蜈支洲岛一日'],
          ['南山文化旅游区 → 大小洞天'],
          ['后海村学冲浪 → 皇后湾 → 晚上鹿回头夜景'],
          ['免税城购物 → 天涯海角 → 返程']
        ],
        7: [
          ['抵达 → 大东海/三亚湾休整 → 第一市场海鲜'],
          ['亚龙湾全天（游泳+水上项目）'],
          ['蜈支洲岛一日'],
          ['南山观音 → 大小洞天'],
          ['后海村冲浪 → 藤海渔村'],
          ['免税城 + 海棠湾沙滩日落'],
          ['鹿回头日出 → 市区采购水果 → 返程']
        ]
      }
    },
    '西安': {
      intro: '西安是十三朝古都，历史厚重：兵马俑、古城墙、不夜城，把「梦回大唐」写进现实。适合历史爱好者与美食猎人。',
      season: '3-5 月与 9-11 月最佳；春秋舒适，夏季炎热。',
      hotels: ['钟楼/鼓楼周边（去哪都方便）', '大雁塔/大唐不夜城附近（夜景美）', '永宁门（城墙边，老城氛围）'],
      foods: ['羊肉泡馍', '肉夹馍（腊汁肉）', '凉皮 + 冰峰汽水', 'biangbiang 面、油泼面', '葫芦头、甑糕', '回民街小吃（柿子饼、镜糕）'],
      spots: [
        { n: '秦始皇兵马俑', t: '历史', d: '世界第八大奇迹，建议请讲解' },
        { n: '西安城墙', t: '骑行', d: '傍晚租自行车环城墙，看落日' },
        { n: '大雁塔 + 大唐不夜城', t: '夜景', d: '晚上灯光秀与不倒翁表演' },
        { n: '回民街', t: '美食', d: '小吃一条街，人很多但必逛' },
        { n: '陕西历史博物馆', t: '历史', d: '免费但需提前预约，文物精品多' },
        { n: '华清宫', t: '历史', d: '骊山脚下的唐代离宫，可看《长恨歌》演出' },
        { n: '大唐芙蓉园', t: '夜景', d: '仿唐皇家园林，夜间演出震撼' },
        { n: '永兴坊', t: '美食', d: '摔碗酒发源地，非遗美食聚集' }
      ],
      days: {
        3: [
          ['抵达西安 → 钟楼鼓楼 → 回民街吃晚饭'],
          ['兵马俑 + 华清宫一日（可看《长恨歌》）'],
          ['陕西历史博物馆 → 大雁塔 → 大唐不夜城 → 返程']
        ],
        5: [
          ['抵达 → 钟鼓楼 → 回民街'],
          ['兵马俑 + 华清宫一日'],
          ['陕历博 → 大雁塔 → 大唐芙蓉园'],
          ['城墙骑行 → 永兴坊 → 书院门'],
          ['大明宫遗址 → 采购（腊牛肉等）→ 返程']
        ],
        7: [
          ['抵达 → 钟鼓楼 → 回民街夜市'],
          ['兵马俑 + 华清宫'],
          ['陕历博（提前预约）→ 大雁塔'],
          ['城墙骑行 → 永兴坊 → 大唐不夜城'],
          ['华山一日游（高铁往返，西上北下）'],
          ['法门寺 + 乾陵一日'],
          ['大明宫 → 书院门淘字画 → 返程']
        ]
      }
    },
    '桂林': {
      intro: '桂林山水甲天下：漓江画廊、喀斯特峰林、阳朔田园，是舟行碧波上、人在画中游的经典。适合乘船、徒步与骑行。',
      season: '4-10 月最佳；5-6 月雨季漓江水位高，遇龙河更清。',
      hotels: ['桂林市区（两江四湖附近）', '阳朔西街（热闹方便）', '遇龙河畔民宿（田园宁静）'],
      foods: ['桂林米粉（卤菜粉）', '啤酒鱼（阳朔名菜）', '漓江虾', '荔浦芋扣肉', '田螺酿、豆腐酿', '桂花糕、油茶'],
      spots: [
        { n: '漓江游船（桂林→阳朔）', t: '经典', d: '全程约 4 小时，看九马画山' },
        { n: '遇龙河竹筏', t: '漂流', d: '人工竹筏，田园风光最治愈' },
        { n: '阳朔西街', t: '休闲', d: '中西合璧老街，晚上热闹' },
        { n: '十里画廊', t: '骑行', d: '月亮山、大榕树沿线骑行' },
        { n: '银子岩', t: '溶洞', d: '喀斯特溶洞，钟乳石晶莹' },
        { n: '两江四湖', t: '夜景', d: '桂林市区夜游，灯光倒影' },
        { n: '龙脊梯田', t: '壮美', d: '世界梯田奇观，秋季金黄（需1天）' },
        { n: '兴坪古镇', t: '人文', d: '20 元人民币背景取景地' }
      ],
      days: {
        3: [
          ['抵达桂林 → 象鼻山 → 两江四湖夜游'],
          ['漓江游船到阳朔 → 西街 → 印象刘三姐'],
          ['遇龙河竹筏 → 十里画廊骑行 → 返程']
        ],
        5: [
          ['抵达桂林 → 象鼻山 → 正阳步行街'],
          ['漓江精华游 → 兴坪古镇 → 阳朔西街'],
          ['遇龙河竹筏 → 十里画廊骑行'],
          ['银子岩 → 世外桃源 → 桂林'],
          ['龙脊梯田一日（或市区采购）→ 返程']
        ],
        7: [
          ['抵达桂林 → 两江四湖'],
          ['漓江游船 → 兴坪 → 宿阳朔'],
          ['遇龙河竹筏 → 十里画廊'],
          ['银子岩 → 大榕树 → 西街夜生活'],
          ['龙脊梯田一日（平安寨+金坑）'],
          ['桂林 → 古东瀑布 → 芦笛岩'],
          ['象鼻山 → 日月双塔 → 返程']
        ]
      }
    },
    '杭州': {
      intro: '杭州是「人间天堂」：西湖山水、茶园竹海、运河老街，处处是江南诗意。适合慢游、喝茶与文艺发呆。',
      season: '3-5 月（春色最佳）与 9-11 月（桂香秋爽）；6 月梅雨、8 月较热。',
      hotels: ['西湖湖滨商圈（看湖方便）', '灵隐/青芝坞（近景区，文艺民宿）', '运河拱宸桥附近（老杭州生活气息）'],
      foods: ['西湖醋鱼', '龙井虾仁', '东坡肉', '片儿川', '定胜糕、荷花酥', '葱包桧、猫耳朵'],
      spots: [
        { n: '西湖十景', t: '经典', d: '断桥、苏堤、雷峰塔沿线慢慢走' },
        { n: '灵隐寺 + 飞来峰', t: '禅意', d: '千年古刹，清晨人少最清静' },
        { n: '龙井村 / 九溪烟树', t: '自然', d: '茶园徒步，喝一杯明前龙井' },
        { n: '西溪湿地', t: '自然', d: '摇橹船穿行芦苇荡' },
        { n: '河坊街', t: '美食', d: '老字号小吃与手工艺街' },
        { n: '京杭大运河', t: '人文', d: '拱宸桥、小河直街，文艺咖啡馆' },
        { n: '太子湾公园', t: '花海', d: '3-4 月郁金香，秋日红叶' },
        { n: '宋城', t: '演出', d: '《宋城千古情》实景演出（可选）' }
      ],
      days: {
        3: [
          ['抵达杭州 → 西湖白堤/断桥 → 湖滨看日落'],
          ['灵隐寺 → 龙井村 → 九溪烟树徒步'],
          ['西溪湿地 → 河坊街 → 返程']
        ],
        5: [
          ['抵达 → 西湖苏堤 → 雷峰塔看落日'],
          ['灵隐寺 → 飞来峰 → 青芝坞'],
          ['龙井村 → 九溪烟树 → 满觉陇（桂花季）'],
          ['西溪湿地 → 运河拱宸桥 → 小河直街'],
          ['太子湾 → 河坊街采购 → 返程']
        ],
        7: [
          ['抵达 → 湖滨散步 → 音乐喷泉'],
          ['西湖东线：断桥→白堤→孤山'],
          ['西湖西线：苏堤→花港观鱼→雷峰塔'],
          ['灵隐寺 → 北高峰'],
          ['龙井村 → 九溪 → 云栖竹径'],
          ['西溪湿地 → 宋城演出'],
          ['运河老街 → 杭州茶厂采购 → 返程']
        ]
      }
    },
    '重庆': {
      intro: '重庆是 8D 魔幻山城：轻轨穿楼、洪崖洞夜景、长江索道、麻辣江湖菜。适合特种兵式逛吃与夜景控。',
      season: '春秋最佳；夏季酷热，冬季多雾但夜景朦胧。',
      hotels: ['解放碑/洪崖洞（核心景区）', '观音桥（商圈+美食多）', '南滨路（江景，看夜景）'],
      foods: ['重庆火锅（九宫格）', '小面', '酸辣粉', '毛血旺、水煮鱼', '磁器口陈麻花', '山城汤圆、冰汤圆'],
      spots: [
        { n: '洪崖洞', t: '夜景', d: '千与千寻同款吊脚楼夜景，千厮门大桥机位最佳' },
        { n: '解放碑', t: '地标', d: '抗战胜利纪念碑，商圈中心' },
        { n: '李子坝轻轨站', t: '奇观', d: '轻轨穿楼，观景平台拍照' },
        { n: '长江索道', t: '体验', d: '跨江缆车，看两江交汇' },
        { n: '磁器口古镇', t: '人文', d: '千年古镇，麻花与毛血旺发源地' },
        { n: '南山一棵树', t: '夜景', d: '俯瞰渝中半岛全景' },
        { n: '武隆天生三桥', t: '自然', d: '《变形金刚》取景地，天坑地缝（需1天）' },
        { n: '鹅岭二厂', t: '文艺', d: '文创园，《从你的全世界路过》取景地' }
      ],
      days: {
        3: [
          ['抵达重庆 → 解放碑 → 八一好吃街'],
          ['李子坝 → 鹅岭二厂 → 长江索道 → 洪崖洞夜景'],
          ['磁器口 → 观音桥 → 返程']
        ],
        5: [
          ['抵达 → 解放碑 → 洪崖洞夜景'],
          ['李子坝 → 鹅岭二厂 → 皇冠大扶梯'],
          ['长江索道 → 南山一棵树 → 南滨路'],
          ['武隆天生三桥一日（或大足石刻）'],
          ['磁器口 → 观音桥好吃街 → 返程']
        ],
        7: [
          ['抵达 → 解放碑 → 八一好吃街'],
          ['李子坝 → 中山四路 → 三峡博物馆'],
          ['长江索道 → 龙门浩老街 → 南山夜景'],
          ['磁器口 → 白公馆渣滓洞'],
          ['武隆天生三桥一日'],
          ['大足石刻一日'],
          ['山城步道 → 火锅告别餐 → 返程']
        ]
      }
    },
    '青岛': {
      intro: '青岛是红瓦绿树、碧海蓝天的海滨之城：德式老建筑、啤酒海鲜、环海木栈道，浪漫又松弛。适合吹海风、喝啤酒。',
      season: '5-10 月最佳；7-8 月可下海，9 月海鲜最肥。',
      hotels: ['栈桥/中山路（老城海景）', '五四广场/奥帆中心（现代海湾）', '八大关附近（别墅街区，安静文艺）'],
      foods: ['辣炒蛤蜊', '鲅鱼水饺', '青岛啤酒（原浆/纯生）', '烧烤 + 野馄饨', '排骨米饭', '海菜凉粉、流亭猪蹄'],
      spots: [
        { n: '栈桥', t: '地标', d: '回澜阁看海鸥（冬季最多）' },
        { n: '八大关', t: '建筑', d: '万国建筑博览，花石楼、公主楼' },
        { n: '五四广场 + 奥帆中心', t: '海湾', d: '「五月的风」雕塑，帆船码头' },
        { n: '崂山', t: '自然', d: '海上第一名山，仰口+太清线' },
        { n: '小麦岛公园', t: '日落', d: '海边草地，看日落绝美' },
        { n: '青岛啤酒博物馆', t: '体验', d: '了解啤酒历史，赠原浆一杯' },
        { n: '大学路网红墙', t: '拍照', d: '红墙转角，文艺打卡' },
        { n: '金沙滩', t: '海滩', d: '黄岛，沙质细软适合玩水' }
      ],
      days: {
        3: [
          ['抵达青岛 → 栈桥 → 中山路 → 劈柴院小吃'],
          ['八大关 → 第二海水浴场 → 五四广场夜景'],
          ['崂山一日（仰口线）→ 返程']
        ],
        5: [
          ['抵达 → 栈桥 → 天主教堂 → 老城区'],
          ['八大关 → 小麦岛日落'],
          ['崂山仰口 → 太清宫'],
          ['啤酒博物馆 → 台东步行街夜市'],
          ['奥帆中心帆船体验 → 金沙滩 → 返程']
        ],
        7: [
          ['抵达 → 栈桥 → 中山路老街'],
          ['八大关 → 花石楼 → 海水浴场'],
          ['崂山北线（仰口+北九水）'],
          ['啤酒博物馆 → 大学路 → 信号山'],
          ['黄岛金沙滩 → 唐岛湾骑行'],
          ['小麦岛日出 → 奥帆中心 → 情人坝'],
          ['台东采购海鲜干货 → 返程']
        ]
      }
    }
  };
  const QUICK = ['大理', '成都', '三亚', '西安', '桂林', '杭州', '重庆', '青岛'];

  /* ================= 未知目的地兜底模板 ================= */
  function genericInfo(name) {
    return {
      intro: '「' + name + '」是一座值得慢慢探索的城市：先锁定市中心或景区周边作为落脚点，再用 1-2 天打卡当地地标与老街，留 1 天体验周边自然或文化，行程会既充实又不赶。建议出发前搜一下当地当季活动与天气。',
      season: '春秋两季通常最舒服；旺季（节假日/暑期）建议提前订酒店与门票。',
      hotels: ['市中心商圈（交通、美食最方便）', '主要景区周边（省时间，早晚人少）', '特色民宿/老城区（体验当地生活）'],
      foods: ['当地特色小吃街（夜市最能出片）', '老字号正餐（点招牌菜）', '本地饮品/甜品（走街串巷时打卡）'],
      spots: [
        { n: '城市地标/中心广场', t: '经典', d: '第一天抵达后先来这儿定位全城' },
        { n: '老街/历史文化街区', t: '人文', d: '了解城市底色，适合慢慢逛' },
        { n: '当地博物馆', t: '人文', d: '快速读懂一座城的历史脉络' },
        { n: '热门景点 TOP1', t: '游玩', d: '出发前搜「' + name + '必去」，选 1-2 个' },
        { n: '周边一日游', t: '自然', d: '搜「' + name + '周边游」，看山看水或古镇' },
        { n: '夜市/夜景', t: '夜景', d: '晚餐后看城市夜景，夜景机位提前查' }
      ],
      days: {
        3: [
          ['抵达' + name + ' → 入住市中心 → 晚饭吃当地特色'],
          ['城市地标 + 老街打卡 → 博物馆 → 夜市'],
          ['周边一日游（或补漏）→ 采购伴手礼 → 返程']
        ],
        5: [
          ['抵达 → 市中心安顿 → 特色晚餐'],
          ['地标 + 老街 → 傍晚看城市夜景'],
          ['博物馆 → 文创街区 → 夜市'],
          ['周边一日游（山/水/古镇）'],
          ['补漏 + 伴手礼采购 → 返程']
        ],
        7: [
          ['抵达 → 市中心 → 晚餐'],
          ['地标 → 老城区漫步'],
          ['博物馆 → 历史街区'],
          ['周边游 A（一日）'],
          ['周边游 B（一日）'],
          ['自由日：咖啡店/书店/购物'],
          ['伴手礼采购 → 返程']
        ]
      }
    };
  }

  function infoOf(name) { return D[name] || genericInfo(name); }
  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec || { history: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  XU.regPanel('travel', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let days = 3;

    function esc(s) { return XU.esc(s); }

    function renderPlan(name) {
      const info = infoOf(name);
      const box = XU.$('#travelOut', el);
      box.innerHTML =
        '<div class="card">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
            '<h2>📍 ' + esc(name) + ' · ' + days + ' 天行程</h2>' +
            '<button class="btn mini ghost" id="tCopy">' + XU.icon('copy') + ' 复制</button>' +
          '</div>' +
          '<p class="sub" style="white-space:pre-line">' + esc(info.intro) + '</p>' +
          '<div class="chip" style="background:var(--card-tint)">🌤️ ' + esc(info.season) + '</div>' +
        '</div>' +
        '<div class="card"><h2>🏨 住宿推荐</h2>' +
          '<div class="list">' + info.hotels.map((h) => '<div class="row-item"><div style="width:38px;height:38px;border-radius:11px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">🏨</div><div class="grow"><div class="title">' + esc(h) + '</div></div></div>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🍜 美食推荐</h2>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' + info.foods.map((f) => '<span class="chip">' + esc(f) + '</span>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🎡 游玩推荐</h2>' +
          '<div class="list">' + info.spots.map((s) =>
            '<div class="row-item"><div style="width:38px;height:38px;border-radius:11px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">🎡</div>' +
            '<div class="grow"><div class="title">' + esc(s.n) + ' <span class="chip" style="font-size:11px">' + esc(s.t) + '</span></div><div class="desc">' + esc(s.d) + '</div></div></div>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🗓️ 每日行程</h2><div class="steps">' +
          (info.days[days] || info.days[3] || []).map((day, i) =>
            '<div class="step"><div style="flex:1"><div class="title" style="font-weight:800;color:var(--primary)">第 ' + (i + 1) + ' 天</div>' +
            '<div class="desc">' + esc(day) + '</div></div></div>').join('') +
        '</div></div>' +
        '<button class="btn ghost" style="width:100%" id="tSave">⭐ 收藏这份行程</button>';

      XU.$('#tCopy', box).onclick = () => {
        const lines = ['【' + name + ' ' + days + '天行程】', info.intro, '',
          '住宿：', info.hotels.map((h) => '· ' + h).join('\n'), '',
          '美食：', info.foods.map((f) => '· ' + f).join('\n'), '',
          '游玩：', info.spots.map((s) => '· ' + s.n + '（' + s.d + '）').join('\n'), '',
          '每日行程：',
          (info.days[days] || []).map((d2, i) => 'Day' + (i + 1) + '：' + d2).join('\n')];
        const text = lines.join('\n');
        XU.copyText ? XU.copyText(text) : navigator.clipboard && navigator.clipboard.writeText(text);
        XU.toast('行程已复制 ✅');
      };
      XU.$('#tSave', box).onclick = async () => {
        data.history = data.history.filter((h) => !(h.name === name && h.days === days));
        data.history.unshift({ name: name, days: days, time: XU.now() });
        data.history = data.history.slice(0, 30);
        await saveData(data);
        renderHistory();
        XU.toast('已收藏到「我的行程」⭐');
      };
    }

    function renderHistory() {
      const box = XU.$('#travelHis', el);
      box.innerHTML = data.history.length
        ? data.history.map((h, i) =>
            '<div class="row-item"><div style="width:40px;height:40px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:18px;flex:0 0 auto">🧳</div>' +
            '<div class="grow"><div class="title" style="font-weight:800">' + esc(h.name) + ' · ' + h.days + ' 天</div><div class="vd">收藏于 ' + esc(h.time || '') + '</div></div>' +
            '<button class="btn mini" data-load="' + i + '">查看</button>' +
            '<button class="btn mini danger" data-del="' + i + '">' + XU.icon('trash') + '</button></div>').join('')
        : '<div class="empty">收藏的行程会出现在这里，方便下次直接查看</div>';
    }

    el.innerHTML =
      '<div class="hero">' +
        '<h2 style="color:#fff;margin:0 0 4px">🧳 旅游规划</h2>' +
        '<p style="margin:0;font-size:12.5px;opacity:.92">输入想去的地方，自动生成简介 + 按天数的行程与推荐</p>' +
      '</div>' +
      '<div class="card">' +
        '<label class="lbl">想去哪里？</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="search" id="tName" placeholder="例如：大理、成都、三亚…" style="flex:1">' +
          '<button class="btn" id="tGo">生成</button>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 12px">' +
          QUICK.map((q) => '<button class="chip" data-q="' + q + '" style="cursor:pointer">' + q + '</button>').join('') +
        '</div>' +
        '<label class="lbl">行程天数</label>' +
        '<div class="seg" id="tDays">' +
          [3, 5, 7].map((n) => '<button data-n="' + n + '"' + (n === days ? ' class="on"' : '') + '>' + n + ' 天</button>').join('') +
        '</div>' +
      '</div>' +
      '<div id="travelOut"></div>' +
      '<div class="card"><h2>🧳 我的行程</h2><p class="sub">收藏过的规划，随时回看</p><div class="list" id="travelHis"></div></div>';

    XU.$('#tGo', el).onclick = () => {
      const name = XU.$('#tName', el).value.trim();
      if (!name) { XU.toast('先输入一个目的地～'); return; }
      renderPlan(name);
    };
    XU.$('#tName', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') XU.$('#tGo', el).click(); });
    XU.$('#tDays', el).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      days = parseInt(b.getAttribute('data-n'), 10);
      XU.$$('#tDays button', el).forEach((x) => x.classList.toggle('on', x === b));
      const cur = XU.$('#travelOut .card h2', el);
      if (cur) {
        const m = /📍 (.+) · (\d+) 天行程/.exec(cur.textContent);
        if (m) renderPlan(m[1]);
      }
    });
    el.addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]');
      if (q) { XU.$('#tName', el).value = q.getAttribute('data-q'); renderPlan(q.getAttribute('data-q')); }
      const load = e.target.closest('[data-load]');
      if (load) {
        const h = data.history[parseInt(load.getAttribute('data-load'), 10)];
        if (h) { XU.$('#tName', el).value = h.name; days = h.days; XU.$$('#tDays button', el).forEach((x) => x.classList.toggle('on', String(x.getAttribute('data-n')) === String(h.days))); renderPlan(h.name); }
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const i = parseInt(del.getAttribute('data-del'), 10);
        XU.confirm('删除这条收藏？', async () => {
          data.history.splice(i, 1);
          await saveData(data);
          renderHistory();
        }, true);
      }
    });
    renderHistory();
  });
})();