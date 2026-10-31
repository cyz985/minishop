-- ============================================================================
-- Mini 在线商城 · 演示商品数据（可选，阶段 3 验收用）
-- 执行：Supabase Dashboard > SQL Editor > 整段粘贴 > Run
-- 说明：
--   1. 仅在 shop_products 为空、需要演示商品时执行。
--   2. 使用固定 UUID，可重复执行，不会产生重复商品。
--   3. 商品归 created_by = null 的公共演示数据，商家后台阶段 4 可继续新增。
-- ============================================================================

insert into public.shop_products
  (id, name, description, price, stock, cover_image_url, category_id, sales_count, is_active)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '轻音无线蓝牙耳机',
    '半入耳设计，蓝牙 5.3 稳定连接，单次续航 6 小时，配合充电仓可使用 24 小时。适合通勤、办公与运动。',
    199.00,
    50,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist+white+wireless+bluetooth+earbuds+with+charging+case+product+photography+clean+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'digital'),
    120,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '便携蓝牙音箱',
    '360 度环绕音效，IPX6 防水，支持双机串联。内置 2000mAh 电池，户外露营与居家聚会都适用。',
    299.00,
    30,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portable+bluetooth+speaker+product+photo+outdoor+lifestyle+clean+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'digital'),
    86,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '智能迷你电饭煲',
    '3L 容量，适合 2-4 人使用。支持预约、快煮、煲汤等 8 种模式，不粘内胆易清洗。',
    399.00,
    20,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern+mini+rice+cooker+kitchen+appliance+product+photo+white+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'appliance'),
    64,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '316 不锈钢保温杯',
    '500ml 容量，316 不锈钢内胆，12 小时长效保温。杯盖一键开合，适合办公与户外。',
    89.00,
    100,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=stainless+steel+insulated+tumbler+bottle+product+photo+minimal+white+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'home'),
    230,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    '简约通勤双肩包',
    '15.6 英寸电脑仓，防泼水面料，多隔层收纳。轻量肩带设计，通勤与短途旅行都合适。',
    159.00,
    40,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist+commuter+backpack+laptop+bag+product+photo+clean+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'fashion'),
    98,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    '每日坚果零食礼盒',
    '独立小包装，混合腰果、巴旦木、核桃与果干。30 包装，办公室与家庭分享都方便。',
    69.00,
    80,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mixed+nuts+snack+gift+box+product+photo+clean+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'food'),
    310,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
    '桌面收纳套装',
    '包含笔筒、文件托盘与抽屉收纳盒，磨砂质感，帮助整理办公桌面。',
    59.00,
    60,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=desk+organizer+set+stationery+storage+product+photo+white+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'home'),
    142,
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
    '加厚防滑瑜伽垫',
    '8mm 加厚 TPE 材质，双面防滑，附赠绑带。适合瑜伽、普拉提与居家健身。',
    79.00,
    35,
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=thick+non-slip+yoga+mat+rolled+product+photo+clean+background&image_size=square_hd',
    (select id from public.shop_categories where slug = 'sports'),
    175,
    true
  )
on conflict (id) do nothing;

-- 商品多图（每个商品 2 张，用于验证详情页图集）
insert into public.shop_product_images (id, product_id, image_url, sort_order)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=white+wireless+earbuds+detail+shot+open+charging+case+studio+lighting&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wireless+earbuds+wearing+lifestyle+photo+modern+commuter&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portable+bluetooth+speaker+close+up+product+detail+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bluetooth+speaker+outdoor+camping+lifestyle+photo&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rice+cooker+open+with+cooked+rice+kitchen+product+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=compact+rice+cooker+on+modern+kitchen+counter+lifestyle&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=insulated+tumbler+detail+texture+product+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=thermos+cup+on+office+desk+lifestyle+photo&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb009', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=commuter+backpack+interior+laptop+compartment+detail+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb010', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=person+wearing+minimalist+backpack+city+street+lifestyle&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mixed+nuts+small+packets+detail+product+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb012', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=nuts+snack+box+on+wooden+table+lifestyle+photo&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb013', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=desk+organizer+with+pens+and+files+detail+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb014', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tidy+desk+setup+with+organizer+lifestyle+photo&image_size=landscape_4_3', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb015', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yoga+mat+texture+detail+product+photo&image_size=landscape_4_3', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb016', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=yoga+mat+in+living+room+home+workout+lifestyle+photo&image_size=landscape_4_3', 1)
on conflict (id) do nothing;
