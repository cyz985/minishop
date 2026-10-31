-- ============================================================================
-- Mini 在线商城 · Supabase 数据库初始化脚本（阶段 1）
-- 适用：复用现有 blog-demo Supabase 项目，不新建实例
-- 执行：Supabase Dashboard > SQL Editor > 新建查询 > 整段粘贴 > Run
-- 说明：
--   1. 所有表使用 shop_ 前缀，避免与博客 posts/categories、问答社区
--      questions/answers/votes 重名。
--   2. 用户体系直接复用 auth.users / Supabase Auth。
--   3. 前端只使用 anon key；权限由 RLS + SECURITY DEFINER RPC 控制。
--   4. 下单、取消订单、领券、商家推进状态均为单事务数据库函数。
--   5. 脚本尽量幂等；如首次执行中断，修正后可从顶部整段重跑。
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ============================================================================
-- 一、表结构
-- ============================================================================

-- 1. 商城用户资料（与 auth.users 一对一）
create table if not exists public.shop_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '商城用户'
    check (char_length(trim(display_name)) between 1 and 40),
  avatar_url text,
  role text not null default 'customer'
    check (role in ('customer', 'merchant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 商品分类
create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (char_length(trim(name)) between 1 and 30),
  slug text not null unique
    check (char_length(trim(slug)) between 1 and 40),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. 商品
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(trim(name)) between 1 and 80),
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  cover_image_url text,
  category_id uuid references public.shop_categories (id) on delete set null,
  sales_count integer not null default 0 check (sales_count >= 0),
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. 商品多图
create table if not exists public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products (id) on delete cascade,
  image_url text not null check (char_length(trim(image_url)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 5. 收货地址
create table if not exists public.shop_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  receiver_name text not null
    check (char_length(trim(receiver_name)) between 1 and 30),
  phone text not null
    check (char_length(trim(phone)) between 6 and 20),
  province text not null default '',
  city text not null default '',
  district text not null default '',
  detail text not null
    check (char_length(trim(detail)) between 1 and 200),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. 购物车
create table if not exists public.shop_cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.shop_products (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- 7. 优惠券模板（满减）
create table if not exists public.shop_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (char_length(trim(code)) between 1 and 30),
  title text not null
    check (char_length(trim(title)) between 1 and 50),
  description text,
  min_amount numeric(12, 2) not null default 0 check (min_amount >= 0),
  discount_amount numeric(12, 2) not null check (discount_amount > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  total_quantity integer not null default 100 check (total_quantity >= 0),
  claimed_count integer not null default 0
    check (claimed_count >= 0 and claimed_count <= total_quantity),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- 8. 用户已领优惠券
create table if not exists public.shop_user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coupon_id uuid not null references public.shop_coupons (id) on delete cascade,
  status text not null default 'unused'
    check (status in ('unused', 'used')),
  claimed_at timestamptz not null default now(),
  used_at timestamptz,
  unique (user_id, coupon_id)
);

-- 9. 订单（含收货地址快照）
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique
    check (char_length(order_no) between 10 and 40),
  user_id uuid not null references auth.users (id) on delete cascade,
  address_id uuid references public.shop_addresses (id) on delete set null,
  receiver_name text not null,
  receiver_phone text not null,
  receiver_address text not null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  payable_amount numeric(12, 2) not null default 0 check (payable_amount >= 0),
  coupon_id uuid references public.shop_coupons (id) on delete set null,
  user_coupon_id uuid references public.shop_user_coupons (id) on delete set null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'shipped', 'completed', 'cancelled')),
  remark text check (remark is null or char_length(remark) <= 200),
  logistics_company text,
  tracking_no text,
  paid_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= total_amount)
);

-- 10. 订单商品快照
create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  product_id uuid references public.shop_products (id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 999),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

-- 11. 商品评价
create table if not exists public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique
    references public.shop_order_items (id) on delete cascade,
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  product_id uuid references public.shop_products (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text not null
    check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. 订单物流时间线
create table if not exists public.shop_order_logistics (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  location text,
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 二、索引
-- ============================================================================

create index if not exists shop_products_active_category_price_idx
  on public.shop_products (category_id, price) where is_active;

create index if not exists shop_products_sales_idx
  on public.shop_products (sales_count desc) where is_active;

create index if not exists shop_products_name_trgm_idx
  on public.shop_products using gin (name gin_trgm_ops);

create index if not exists shop_products_description_trgm_idx
  on public.shop_products using gin (description gin_trgm_ops);

create index if not exists shop_product_images_product_idx
  on public.shop_product_images (product_id, sort_order, created_at);

create index if not exists shop_categories_sort_idx
  on public.shop_categories (sort_order, created_at);

create index if not exists shop_addresses_user_idx
  on public.shop_addresses (user_id, created_at);

-- 每个用户最多一个默认地址（触发器负责维护，索引作为最终兜底）
create unique index if not exists shop_addresses_one_default_idx
  on public.shop_addresses (user_id) where is_default;

create index if not exists shop_coupons_active_dates_idx
  on public.shop_coupons (is_active, starts_at, ends_at);

create index if not exists shop_user_coupons_user_status_idx
  on public.shop_user_coupons (user_id, status, claimed_at desc);

create index if not exists shop_orders_user_created_idx
  on public.shop_orders (user_id, created_at desc);

create index if not exists shop_orders_user_status_idx
  on public.shop_orders (user_id, status, created_at desc);

create index if not exists shop_orders_created_idx
  on public.shop_orders (created_at desc);

create index if not exists shop_order_items_order_idx
  on public.shop_order_items (order_id);

create index if not exists shop_order_items_product_idx
  on public.shop_order_items (product_id);

create index if not exists shop_reviews_product_idx
  on public.shop_reviews (product_id, created_at desc);

create index if not exists shop_reviews_user_idx
  on public.shop_reviews (user_id, created_at desc);

create index if not exists shop_order_logistics_order_idx
  on public.shop_order_logistics (order_id, happened_at asc);

-- ============================================================================
-- 三、通用与权限辅助函数
-- ============================================================================

-- 自动维护 updated_at
create or replace function public.shop_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 判断当前登录用户是否为商家（只返回布尔值，不泄露资料）
create or replace function public.shop_is_merchant()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.shop_profiles p
    where p.id = (select auth.uid())
      and p.role = 'merchant'
  );
$$;

-- 注册后自动创建商城资料
create or replace function public.shop_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.shop_profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        '商城用户'
      ),
      40
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 阻止 API 客户端自行修改角色；商家角色只能由管理端 SQL 配置
create or replace function public.shop_guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and (
       current_user in ('anon', 'authenticated')
       or coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon', 'authenticated')
     )
  then
    raise exception '无权修改用户角色';
  end if;

  return new;
end;
$$;

-- 默认地址维护：首个地址默认、设默认时取消其他、删除默认后自动补位
create or replace function public.shop_handle_address_default()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_next_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.is_default
       or not exists (
         select 1
         from public.shop_addresses a
         where a.user_id = new.user_id
           and a.is_default
       )
    then
      new.is_default := true;

      update public.shop_addresses
      set is_default = false
      where user_id = new.user_id
        and is_default
        and id <> new.id;
    end if;

    return new;

  elsif tg_op = 'UPDATE' then
    if new.is_default and not old.is_default then
      update public.shop_addresses
      set is_default = false
      where user_id = new.user_id
        and is_default
        and id <> new.id;
    end if;

    return new;

  elsif tg_op = 'DELETE' then
    if old.is_default then
      select a.id
      into v_next_id
      from public.shop_addresses a
      where a.user_id = old.user_id
      order by a.created_at asc, a.id asc
      limit 1;

      if v_next_id is not null then
        update public.shop_addresses
        set is_default = true
        where id = v_next_id;
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

-- ============================================================================
-- 四、业务校验触发器
-- ============================================================================

-- 购物车写入：校验归属、商品状态、库存
create or replace function public.shop_validate_cart_item()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_stock integer;
  v_active boolean;
  v_name text;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception '无权操作他人的购物车';
  end if;

  select p.stock, p.is_active, p.name
  into v_stock, v_active, v_name
  from public.shop_products p
  where p.id = new.product_id;

  if not found then
    raise exception '商品不存在';
  end if;

  if not v_active then
    raise exception '商品「%s」已下架', v_name;
  end if;

  if new.quantity > v_stock then
    raise exception '商品「%s」库存不足，当前库存 %s 件', v_name, v_stock;
  end if;

  return new;
end;
$$;

-- 评价写入：仅本人已完成订单、订单项与商品匹配、关键字段不可更改
create or replace function public.shop_validate_review()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_owner uuid;
  v_order_id uuid;
  v_product_id uuid;
  v_status text;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception '无权评价他人的订单';
  end if;

  if tg_op = 'UPDATE' then
    if new.order_item_id <> old.order_item_id
       or new.order_id <> old.order_id
       or new.product_id is distinct from old.product_id
       or new.user_id <> old.user_id
    then
      raise exception '评价的订单项、商品和用户不可更改';
    end if;
  end if;

  select oi.order_id, oi.product_id, o.user_id, o.status
  into v_order_id, v_product_id, v_owner, v_status
  from public.shop_order_items oi
  join public.shop_orders o on o.id = oi.order_id
  where oi.id = new.order_item_id;

  if not found then
    raise exception '订单项不存在';
  end if;

  if v_owner <> new.user_id then
    raise exception '只能评价自己的订单';
  end if;

  if new.order_id <> v_order_id then
    raise exception '评价与订单项不匹配';
  end if;

  if new.product_id is distinct from v_product_id then
    raise exception '评价与订单商品不匹配';
  end if;

  if v_status <> 'completed' then
    raise exception '订单完成后才能评价';
  end if;

  return new;
end;
$$;

-- 订单状态变化自动写物流时间线
create or replace function public.shop_log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_description text;
begin
  if tg_op = 'INSERT' then
    insert into public.shop_order_logistics (order_id, description, happened_at)
    values (new.id, '订单创建成功，等待付款', new.created_at);
    return new;
  end if;

  if new.status is distinct from old.status then
    v_description := case new.status
      when 'pending_payment' then '订单等待付款'
      when 'paid' then '订单已支付，等待商家发货'
      when 'shipped' then
        '商家已发货' ||
        case
          when new.tracking_no is not null and trim(new.tracking_no) <> ''
            then '，物流单号：' || new.tracking_no
          else ''
        end
      when 'completed' then '订单已完成'
      when 'cancelled' then '订单已取消'
      else '订单状态已更新'
    end;

    insert into public.shop_order_logistics (order_id, description, happened_at)
    values (new.id, v_description, now());
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 五、订单与优惠券 RPC（单事务完成）
-- ============================================================================

-- 订单号：SO + 年月日时分秒 + 8 位 UUID 片段
create or replace function public.shop_generate_order_no()
returns text
language plpgsql
volatile
as $$
begin
  return 'SO'
    || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS')
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
end;
$$;

-- 内部库存恢复函数（不对外开放）
create or replace function public.shop_restore_order_stock_internal(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item record;
begin
  for v_item in
    select oi.product_id, oi.quantity
    from public.shop_order_items oi
    where oi.order_id = p_order_id
      and oi.product_id is not null
  loop
    update public.shop_products p
    set stock = p.stock + v_item.quantity,
        sales_count = greatest(p.sales_count - v_item.quantity, 0)
    where p.id = v_item.product_id;
  end loop;
end;
$$;

-- 领取优惠券
create or replace function public.shop_claim_coupon(p_coupon_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon public.shop_coupons%rowtype;
  v_user_coupon_id uuid;
begin
  if v_user_id is null then
    raise exception '请先登录后再领取优惠券';
  end if;

  select *
  into v_coupon
  from public.shop_coupons
  where id = p_coupon_id
  for update;

  if not found then
    raise exception '优惠券不存在';
  end if;

  if not v_coupon.is_active then
    raise exception '优惠券已停止发放';
  end if;

  if now() < v_coupon.starts_at or now() > v_coupon.ends_at then
    raise exception '优惠券不在领取时间内';
  end if;

  if exists (
    select 1
    from public.shop_user_coupons uc
    where uc.user_id = v_user_id
      and uc.coupon_id = p_coupon_id
  ) then
    raise exception '该优惠券已经领取过了';
  end if;

  if v_coupon.claimed_count >= v_coupon.total_quantity then
    raise exception '优惠券已领完';
  end if;

  insert into public.shop_user_coupons (user_id, coupon_id)
  values (v_user_id, p_coupon_id)
  returning id into v_user_coupon_id;

  update public.shop_coupons
  set claimed_count = claimed_count + 1
  where id = p_coupon_id;

  return v_user_coupon_id;
end;
$$;

-- 创建订单：
--   校验地址、购物车归属、商品状态和库存 -> 创建订单 -> 原子扣库存/写快照
--   -> 校验并核销优惠券 -> 更新金额 -> 清空已下单购物车项
create or replace function public.shop_create_order(
  p_address_id uuid,
  p_cart_item_ids uuid[] default null,
  p_user_coupon_id uuid default null,
  p_remark text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_address public.shop_addresses%rowtype;
  v_order_id uuid;
  v_cart_ids uuid[];
  v_item record;
  v_product_name text;
  v_product_price numeric(12, 2);
  v_product_image text;
  v_product_stock integer;
  v_product_active boolean;
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_payable numeric(12, 2) := 0;
  v_coupon record;
  v_coupon_id uuid;
  v_remark text;
  v_receiver_address text;
begin
  if v_user_id is null then
    raise exception '请先登录后再下单';
  end if;

  if p_address_id is null then
    raise exception '请选择收货地址';
  end if;

  select *
  into v_address
  from public.shop_addresses
  where id = p_address_id
    and user_id = v_user_id;

  if not found then
    raise exception '收货地址不存在或无权使用';
  end if;

  v_receiver_address := concat_ws(
    ' ',
    nullif(trim(v_address.province), ''),
    nullif(trim(v_address.city), ''),
    nullif(trim(v_address.district), ''),
    v_address.detail
  );

  v_remark := nullif(trim(p_remark), '');
  if v_remark is not null and char_length(v_remark) > 200 then
    raise exception '订单备注不能超过 200 字';
  end if;

  -- 购物车项：传空数组或 null 表示全部商品；传 ID 时必须是当前用户自己的项
  if p_cart_item_ids is null or cardinality(p_cart_item_ids) = 0 then
    select array_agg(ci.id)
    into v_cart_ids
    from public.shop_cart_items ci
    where ci.user_id = v_user_id;
  else
    if exists (
      select 1
      from unnest(p_cart_item_ids) as x(cart_id)
      where x.cart_id is null
    ) then
      raise exception '购物车商品参数不合法';
    end if;

    select array_agg(ci.id)
    into v_cart_ids
    from public.shop_cart_items ci
    where ci.user_id = v_user_id
      and ci.id = any(p_cart_item_ids);

    if coalesce(cardinality(v_cart_ids), 0)
       <> (select count(distinct x.cart_id) from unnest(p_cart_item_ids) as x(cart_id))
    then
      raise exception '购物车商品不存在或无权结算';
    end if;
  end if;

  if v_cart_ids is null or cardinality(v_cart_ids) = 0 then
    raise exception '购物车为空，无法创建订单';
  end if;

  -- 先创建订单主记录，金额在商品快照写完并计算后回填
  insert into public.shop_orders (
    order_no,
    user_id,
    address_id,
    receiver_name,
    receiver_phone,
    receiver_address,
    total_amount,
    discount_amount,
    payable_amount,
    status,
    remark
  )
  values (
    public.shop_generate_order_no(),
    v_user_id,
    v_address.id,
    v_address.receiver_name,
    v_address.phone,
    v_receiver_address,
    0,
    0,
    0,
    'pending_payment',
    v_remark
  )
  returning id into v_order_id;

  -- 逐项扣库存并写订单商品快照（条件更新天然防止超卖）
  for v_item in
    select ci.id, ci.product_id, ci.quantity
    from public.shop_cart_items ci
    where ci.user_id = v_user_id
      and ci.id = any(v_cart_ids)
    order by ci.created_at asc, ci.id asc
  loop
    update public.shop_products p
    set stock = p.stock - v_item.quantity,
        sales_count = p.sales_count + v_item.quantity
    where p.id = v_item.product_id
      and p.is_active
      and p.stock >= v_item.quantity
    returning p.name, p.price, p.cover_image_url
    into v_product_name, v_product_price, v_product_image;

    if not found then
      select p.name, p.stock, p.is_active
      into v_product_name, v_product_stock, v_product_active
      from public.shop_products p
      where p.id = v_item.product_id;

      if not found then
        raise exception '购物车中的商品已不存在，请移除后重试';
      elsif not v_product_active then
        raise exception '商品「%s」已下架，请移除后重试', v_product_name;
      else
        raise exception '商品「%s」库存不足，当前库存 %s 件', v_product_name, v_product_stock;
      end if;
    end if;

    v_subtotal := round(v_product_price * v_item.quantity, 2);

    insert into public.shop_order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      unit_price,
      quantity,
      subtotal
    )
    values (
      v_order_id,
      v_item.product_id,
      v_product_name,
      v_product_image,
      v_product_price,
      v_item.quantity,
      v_subtotal
    );

    v_total := round(v_total + v_subtotal, 2);
  end loop;

  -- 校验并核销优惠券
  if p_user_coupon_id is not null then
    select
      uc.id as user_coupon_id,
      uc.status as user_coupon_status,
      c.id as coupon_id,
      c.title,
      c.min_amount,
      c.discount_amount,
      c.is_active,
      c.starts_at,
      c.ends_at
    into v_coupon
    from public.shop_user_coupons uc
    join public.shop_coupons c on c.id = uc.coupon_id
    where uc.id = p_user_coupon_id
      and uc.user_id = v_user_id
    for update of uc;

    if not found then
      raise exception '优惠券不存在或无权使用';
    end if;

    if v_coupon.user_coupon_status <> 'unused' then
      raise exception '优惠券已使用';
    end if;

    if not v_coupon.is_active then
      raise exception '优惠券已停用';
    end if;

    if now() < v_coupon.starts_at or now() > v_coupon.ends_at then
      raise exception '优惠券不在有效期内';
    end if;

    if v_total < v_coupon.min_amount then
      raise exception '订单金额未达到优惠券使用门槛，需满 %s 元', v_coupon.min_amount;
    end if;

    v_discount := least(v_coupon.discount_amount, v_total);
    v_coupon_id := v_coupon.coupon_id;

    update public.shop_user_coupons
    set status = 'used',
        used_at = now()
    where id = v_coupon.user_coupon_id;
  end if;

  v_payable := greatest(v_total - v_discount, 0);

  update public.shop_orders
  set total_amount = v_total,
      discount_amount = v_discount,
      payable_amount = v_payable,
      coupon_id = v_coupon_id,
      user_coupon_id = p_user_coupon_id,
      remark = v_remark
  where id = v_order_id;

  -- 只清理本次已下单的购物车项
  delete from public.shop_cart_items
  where user_id = v_user_id
    and id = any(v_cart_ids);

  return v_order_id;
end;
$$;

-- 用户取消待支付订单：恢复库存、销量与优惠券
create or replace function public.shop_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.shop_orders%rowtype;
begin
  if v_user_id is null then
    raise exception '请先登录';
  end if;

  select *
  into v_order
  from public.shop_orders
  where id = p_order_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception '订单不存在或无权操作';
  end if;

  if v_order.status <> 'pending_payment' then
    raise exception '只有待支付订单可以取消';
  end if;

  perform public.shop_restore_order_stock_internal(p_order_id);

  if v_order.user_coupon_id is not null then
    update public.shop_user_coupons
    set status = 'unused',
        used_at = null
    where id = v_order.user_coupon_id
      and user_id = v_user_id
      and status = 'used';
  end if;

  update public.shop_orders
  set status = 'cancelled',
      cancelled_at = now()
  where id = p_order_id;
end;
$$;

-- 商家推进订单状态（支付 / 发货 / 完成 / 取消）
create or replace function public.shop_merchant_set_order_status(
  p_order_id uuid,
  p_new_status text,
  p_logistics_company text default null,
  p_tracking_no text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_order public.shop_orders%rowtype;
begin
  if not public.shop_is_merchant() then
    raise exception '仅商家可以操作订单';
  end if;

  select *
  into v_order
  from public.shop_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception '订单不存在';
  end if;

  case p_new_status
    when 'paid' then
      if v_order.status <> 'pending_payment' then
        raise exception '只有待支付订单可以标记为已支付';
      end if;

      update public.shop_orders
      set status = 'paid',
          paid_at = now()
      where id = p_order_id;

    when 'shipped' then
      if v_order.status <> 'paid' then
        raise exception '只有已支付订单可以发货';
      end if;

      if p_tracking_no is null or trim(p_tracking_no) = '' then
        raise exception '发货时必须填写物流单号';
      end if;

      update public.shop_orders
      set status = 'shipped',
          logistics_company = coalesce(nullif(trim(p_logistics_company), ''), '商家物流'),
          tracking_no = trim(p_tracking_no),
          shipped_at = now()
      where id = p_order_id;

    when 'completed' then
      if v_order.status <> 'shipped' then
        raise exception '只有已发货订单可以标记为已完成';
      end if;

      update public.shop_orders
      set status = 'completed',
          completed_at = now()
      where id = p_order_id;

    when 'cancelled' then
      if v_order.status <> 'pending_payment' then
        raise exception '只有待支付订单可以取消';
      end if;

      perform public.shop_restore_order_stock_internal(p_order_id);

      if v_order.user_coupon_id is not null then
        update public.shop_user_coupons
        set status = 'unused',
            used_at = null
        where id = v_order.user_coupon_id
          and status = 'used';
      end if;

      update public.shop_orders
      set status = 'cancelled',
          cancelled_at = now()
      where id = p_order_id;

    else
      raise exception '不支持的订单状态：%s', p_new_status;
  end case;
end;
$$;

-- ============================================================================
-- 六、触发器绑定
-- ============================================================================

-- auth.users 新用户 -> shop_profiles
drop trigger if exists shop_on_auth_user_created on auth.users;
create trigger shop_on_auth_user_created
after insert on auth.users
for each row execute function public.shop_handle_new_user();

-- 角色防篡改
drop trigger if exists shop_profiles_guard_role on public.shop_profiles;
create trigger shop_profiles_guard_role
before update on public.shop_profiles
for each row execute function public.shop_guard_profile_role();

-- updated_at
drop trigger if exists shop_profiles_set_updated_at on public.shop_profiles;
create trigger shop_profiles_set_updated_at
before update on public.shop_profiles
for each row execute function public.shop_set_updated_at();

drop trigger if exists shop_products_set_updated_at on public.shop_products;
create trigger shop_products_set_updated_at
before update on public.shop_products
for each row execute function public.shop_set_updated_at();

drop trigger if exists shop_addresses_set_updated_at on public.shop_addresses;
create trigger shop_addresses_set_updated_at
before update on public.shop_addresses
for each row execute function public.shop_set_updated_at();

drop trigger if exists shop_cart_items_set_updated_at on public.shop_cart_items;
create trigger shop_cart_items_set_updated_at
before update on public.shop_cart_items
for each row execute function public.shop_set_updated_at();

drop trigger if exists shop_orders_set_updated_at on public.shop_orders;
create trigger shop_orders_set_updated_at
before update on public.shop_orders
for each row execute function public.shop_set_updated_at();

drop trigger if exists shop_reviews_set_updated_at on public.shop_reviews;
create trigger shop_reviews_set_updated_at
before update on public.shop_reviews
for each row execute function public.shop_set_updated_at();

-- 默认地址
drop trigger if exists shop_addresses_default_biu on public.shop_addresses;
create trigger shop_addresses_default_biu
before insert or update on public.shop_addresses
for each row execute function public.shop_handle_address_default();

drop trigger if exists shop_addresses_default_ad on public.shop_addresses;
create trigger shop_addresses_default_ad
after delete on public.shop_addresses
for each row execute function public.shop_handle_address_default();

-- 购物车库存校验
drop trigger if exists shop_cart_items_validate on public.shop_cart_items;
create trigger shop_cart_items_validate
before insert or update on public.shop_cart_items
for each row execute function public.shop_validate_cart_item();

-- 评价校验
drop trigger if exists shop_reviews_validate on public.shop_reviews;
create trigger shop_reviews_validate
before insert or update on public.shop_reviews
for each row execute function public.shop_validate_review();

-- 订单创建与状态变化的物流节点
drop trigger if exists shop_orders_log_insert on public.shop_orders;
create trigger shop_orders_log_insert
after insert on public.shop_orders
for each row execute function public.shop_log_order_status();

drop trigger if exists shop_orders_log_status on public.shop_orders;
create trigger shop_orders_log_status
after update of status on public.shop_orders
for each row execute function public.shop_log_order_status();

-- ============================================================================
-- 七、启用 RLS
-- ============================================================================

alter table public.shop_profiles enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_product_images enable row level security;
alter table public.shop_addresses enable row level security;
alter table public.shop_cart_items enable row level security;
alter table public.shop_coupons enable row level security;
alter table public.shop_user_coupons enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_reviews enable row level security;
alter table public.shop_order_logistics enable row level security;

-- ============================================================================
-- 八、RLS 策略
-- ============================================================================

-- 8.1 用户资料
drop policy if exists shop_profiles_select_own_or_merchant on public.shop_profiles;
create policy shop_profiles_select_own_or_merchant
on public.shop_profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.shop_is_merchant()
);

drop policy if exists shop_profiles_update_own on public.shop_profiles;
create policy shop_profiles_update_own
on public.shop_profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- 8.2 分类：所有人可读，商家可维护
drop policy if exists shop_categories_select_public on public.shop_categories;
create policy shop_categories_select_public
on public.shop_categories
for select
to anon, authenticated
using (true);

drop policy if exists shop_categories_insert_merchant on public.shop_categories;
create policy shop_categories_insert_merchant
on public.shop_categories
for insert
to authenticated
with check (public.shop_is_merchant());

drop policy if exists shop_categories_update_merchant on public.shop_categories;
create policy shop_categories_update_merchant
on public.shop_categories
for update
to authenticated
using (public.shop_is_merchant())
with check (public.shop_is_merchant());

drop policy if exists shop_categories_delete_merchant on public.shop_categories;
create policy shop_categories_delete_merchant
on public.shop_categories
for delete
to authenticated
using (public.shop_is_merchant());

-- 8.3 商品：访客/用户只看上架，商家看全部并管理
drop policy if exists shop_products_select_active_or_merchant on public.shop_products;
create policy shop_products_select_active_or_merchant
on public.shop_products
for select
to anon, authenticated
using (
  is_active
  or public.shop_is_merchant()
);

drop policy if exists shop_products_insert_merchant on public.shop_products;
create policy shop_products_insert_merchant
on public.shop_products
for insert
to authenticated
with check (public.shop_is_merchant());

drop policy if exists shop_products_update_merchant on public.shop_products;
create policy shop_products_update_merchant
on public.shop_products
for update
to authenticated
using (public.shop_is_merchant())
with check (public.shop_is_merchant());

drop policy if exists shop_products_delete_merchant on public.shop_products;
create policy shop_products_delete_merchant
on public.shop_products
for delete
to authenticated
using (public.shop_is_merchant());

-- 8.4 商品图片：跟随商品可见性，商家管理
drop policy if exists shop_product_images_select on public.shop_product_images;
create policy shop_product_images_select
on public.shop_product_images
for select
to anon, authenticated
using (
  public.shop_is_merchant()
  or exists (
    select 1
    from public.shop_products p
    where p.id = shop_product_images.product_id
      and p.is_active
  )
);

drop policy if exists shop_product_images_insert_merchant on public.shop_product_images;
create policy shop_product_images_insert_merchant
on public.shop_product_images
for insert
to authenticated
with check (public.shop_is_merchant());

drop policy if exists shop_product_images_update_merchant on public.shop_product_images;
create policy shop_product_images_update_merchant
on public.shop_product_images
for update
to authenticated
using (public.shop_is_merchant())
with check (public.shop_is_merchant());

drop policy if exists shop_product_images_delete_merchant on public.shop_product_images;
create policy shop_product_images_delete_merchant
on public.shop_product_images
for delete
to authenticated
using (public.shop_is_merchant());

-- 8.5 地址：用户仅自己
drop policy if exists shop_addresses_owner_all on public.shop_addresses;
create policy shop_addresses_owner_all
on public.shop_addresses
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 8.6 购物车：用户仅自己
drop policy if exists shop_cart_items_owner_all on public.shop_cart_items;
create policy shop_cart_items_owner_all
on public.shop_cart_items
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 8.7 优惠券模板：公开读启用券，商家管理
drop policy if exists shop_coupons_select_active_or_merchant on public.shop_coupons;
create policy shop_coupons_select_active_or_merchant
on public.shop_coupons
for select
to anon, authenticated
using (
  is_active
  or public.shop_is_merchant()
);

drop policy if exists shop_coupons_insert_merchant on public.shop_coupons;
create policy shop_coupons_insert_merchant
on public.shop_coupons
for insert
to authenticated
with check (public.shop_is_merchant());

drop policy if exists shop_coupons_update_merchant on public.shop_coupons;
create policy shop_coupons_update_merchant
on public.shop_coupons
for update
to authenticated
using (public.shop_is_merchant())
with check (public.shop_is_merchant());

drop policy if exists shop_coupons_delete_merchant on public.shop_coupons;
create policy shop_coupons_delete_merchant
on public.shop_coupons
for delete
to authenticated
using (public.shop_is_merchant());

-- 8.8 用户优惠券：仅本人读，写入只允许 RPC
drop policy if exists shop_user_coupons_select_own on public.shop_user_coupons;
create policy shop_user_coupons_select_own
on public.shop_user_coupons
for select
to authenticated
using (user_id = (select auth.uid()));

-- 8.9 订单：本人或商家读，写入只允许 RPC
drop policy if exists shop_orders_select_own_or_merchant on public.shop_orders;
create policy shop_orders_select_own_or_merchant
on public.shop_orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.shop_is_merchant()
);

-- 8.10 订单商品：跟随订单可见性
drop policy if exists shop_order_items_select on public.shop_order_items;
create policy shop_order_items_select
on public.shop_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_orders o
    where o.id = shop_order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or public.shop_is_merchant()
      )
  )
);

-- 8.11 评价：所有人读，登录用户写自己的
drop policy if exists shop_reviews_select_public on public.shop_reviews;
create policy shop_reviews_select_public
on public.shop_reviews
for select
to anon, authenticated
using (true);

drop policy if exists shop_reviews_insert_own on public.shop_reviews;
create policy shop_reviews_insert_own
on public.shop_reviews
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists shop_reviews_update_own on public.shop_reviews;
create policy shop_reviews_update_own
on public.shop_reviews
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists shop_reviews_delete_own on public.shop_reviews;
create policy shop_reviews_delete_own
on public.shop_reviews
for delete
to authenticated
using (user_id = (select auth.uid()));

-- 8.12 物流：本人或商家读，商家追加/维护
drop policy if exists shop_order_logistics_select on public.shop_order_logistics;
create policy shop_order_logistics_select
on public.shop_order_logistics
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_orders o
    where o.id = shop_order_logistics.order_id
      and (
        o.user_id = (select auth.uid())
        or public.shop_is_merchant()
      )
  )
);

drop policy if exists shop_order_logistics_insert_merchant on public.shop_order_logistics;
create policy shop_order_logistics_insert_merchant
on public.shop_order_logistics
for insert
to authenticated
with check (public.shop_is_merchant());

drop policy if exists shop_order_logistics_update_merchant on public.shop_order_logistics;
create policy shop_order_logistics_update_merchant
on public.shop_order_logistics
for update
to authenticated
using (public.shop_is_merchant())
with check (public.shop_is_merchant());

drop policy if exists shop_order_logistics_delete_merchant on public.shop_order_logistics;
create policy shop_order_logistics_delete_merchant
on public.shop_order_logistics
for delete
to authenticated
using (public.shop_is_merchant());

-- ============================================================================
-- 九、表级权限
-- ============================================================================

grant select on public.shop_categories to anon, authenticated;
grant select on public.shop_products to anon, authenticated;
grant select on public.shop_product_images to anon, authenticated;
grant select on public.shop_coupons to anon, authenticated;
grant select on public.shop_reviews to anon, authenticated;

grant select, update on public.shop_profiles to authenticated;
grant select, insert, update, delete on public.shop_categories to authenticated;
grant select, insert, update, delete on public.shop_products to authenticated;
grant select, insert, update, delete on public.shop_product_images to authenticated;
grant select, insert, update, delete on public.shop_addresses to authenticated;
grant select, insert, update, delete on public.shop_cart_items to authenticated;
grant select, insert, update, delete on public.shop_coupons to authenticated;
grant select on public.shop_user_coupons to authenticated;
grant select on public.shop_orders to authenticated;
grant select on public.shop_order_items to authenticated;
grant select, insert, update, delete on public.shop_reviews to authenticated;
grant select, insert, update, delete on public.shop_order_logistics to authenticated;

-- ============================================================================
-- 十、函数权限（内部函数不对客户端开放）
-- ============================================================================

revoke all on function public.shop_set_updated_at() from public;
revoke all on function public.shop_guard_profile_role() from public;
revoke all on function public.shop_handle_new_user() from public;
revoke all on function public.shop_handle_address_default() from public;
revoke all on function public.shop_validate_cart_item() from public;
revoke all on function public.shop_validate_review() from public;
revoke all on function public.shop_log_order_status() from public;
revoke all on function public.shop_generate_order_no() from public;
revoke all on function public.shop_restore_order_stock_internal(uuid) from public;

revoke all on function public.shop_is_merchant() from public;
grant execute on function public.shop_is_merchant() to anon, authenticated;

revoke all on function public.shop_claim_coupon(uuid) from public;
grant execute on function public.shop_claim_coupon(uuid) to authenticated;

revoke all on function public.shop_create_order(uuid, uuid[], uuid, text) from public;
grant execute on function public.shop_create_order(uuid, uuid[], uuid, text) to authenticated;

revoke all on function public.shop_cancel_order(uuid) from public;
grant execute on function public.shop_cancel_order(uuid) to authenticated;

revoke all on function public.shop_merchant_set_order_status(uuid, text, text, text) from public;
grant execute on function public.shop_merchant_set_order_status(uuid, text, text, text) to authenticated;

-- ============================================================================
-- 十一、已有用户资料回填
-- ============================================================================

insert into public.shop_profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(u.email, '@', 1), ''),
      '商城用户'
    ),
    40
  )
from auth.users u
on conflict (id) do nothing;

-- ============================================================================
-- 十二、基础演示数据（分类与满减券，可重复执行）
-- ============================================================================

insert into public.shop_categories (name, slug, description, sort_order)
values
  ('数码影音', 'digital', '耳机、音箱、数码配件', 1),
  ('家用电器', 'appliance', '小家电与生活电器', 2),
  ('服饰鞋包', 'fashion', '服装、鞋履、箱包', 3),
  ('家居生活', 'home', '家居用品与收纳', 4),
  ('食品饮料', 'food', '零食、饮品、地方特产', 5),
  ('图书文具', 'books', '图书、文具、办公用品', 6),
  ('运动户外', 'sports', '运动装备与户外用品', 7)
on conflict (slug) do nothing;

insert into public.shop_coupons (
  code,
  title,
  description,
  min_amount,
  discount_amount,
  starts_at,
  ends_at,
  total_quantity,
  is_active
)
values
  ('SHOP10', '新人满100减10', '订单满 100 元可用，减免 10 元', 100, 10, now(), now() + interval '365 days', 500, true),
  ('SHOP30', '满300减30', '订单满 300 元可用，减免 30 元', 300, 30, now(), now() + interval '365 days', 300, true),
  ('SHOP50', '满500减50', '订单满 500 元可用，减免 50 元', 500, 50, now(), now() + interval '365 days', 200, true)
on conflict (code) do nothing;

-- ============================================================================
-- 十三、商家账号配置说明
-- ============================================================================
-- 先在应用注册商家账号，再在 SQL Editor 执行（把邮箱替换为真实商家邮箱）：
--
-- update public.shop_profiles
-- set role = 'merchant'
-- where id = (
--   select id from auth.users where email = 'merchant@example.com'
-- );
--
-- 配置后，商家重新登录即可在阶段 4 的商家后台维护商品和订单。
-- 不要把 service_role key 写入前端 .env 或提交到 Git。
-- ============================================================================
