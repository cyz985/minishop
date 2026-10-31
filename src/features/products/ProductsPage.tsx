// 课程作业：商品列表首页。
// 基础功能：商品、分类、价格、库存、销量、分页。
// 扩展功能：关键词搜索、分类筛选、价格区间、销量/价格排序、个性化推荐。

import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { getErrorMessage } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import type { ShopCategory } from '../../types/models';
import { ProductCard, type ProductWithCategory } from './ProductCard';
import { RecommendedProducts } from './RecommendedProducts';

const PAGE_SIZE = 12;

type SortOption = 'newest' | 'sales' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: '最新上架' },
  { value: 'sales', label: '销量优先' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' }
];

export function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [keywordInput, setKeywordInput] = useState('');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        setError('Supabase 尚未完成配置');
        setIsLoading(false);
        return;
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('shop_products')
        .select('*, category:shop_categories(id, name, slug)', { count: 'exact' })
        .eq('is_active', true);

      if (keyword) {
        const safeKeyword = keyword.replace(/[,()%]/g, ' ').trim();
        if (safeKeyword) {
          query = query.or(
            `name.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%`
          );
        }
      }
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      if (minPrice) {
        query = query.gte('price', Number(minPrice));
      }
      if (maxPrice) {
        query = query.lte('price', Number(maxPrice));
      }

      switch (sort) {
        case 'sales':
          query = query.order('sales_count', { ascending: false });
          break;
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const [productsResult, categoriesResult] = await Promise.all([
        query.range(from, to),
        supabase
          .from('shop_categories')
          .select('*')
          .order('sort_order', { ascending: true })
      ]);

      if (!active) return;

      if (productsResult.error) {
        setError(getErrorMessage(productsResult.error));
      } else {
        setProducts((productsResult.data ?? []) as ProductWithCategory[]);
        setTotal(productsResult.count ?? 0);
      }

      if (!categoriesResult.error) {
        setCategories((categoriesResult.data ?? []) as ShopCategory[]);
      }

      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [page, keyword, categoryId, minPrice, maxPrice, sort, reloadKey]);

  function applyFilters() {
    const min = minPriceInput.trim();
    const max = maxPriceInput.trim();
    if (min && max && Number(min) > Number(max)) {
      setError('最低价不能高于最高价');
      return;
    }
    setKeyword(keywordInput.trim());
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  }

  function resetFilters() {
    setKeywordInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setKeyword('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setPage(1);
  }

  const hasFilters = Boolean(keyword || categoryId || minPrice || maxPrice);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-50 via-white to-white px-6 py-10 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          Mini Online Shop
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
          小铺 · 精选好物
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-600">
          数码、家居、服饰、食品一站选购。支持搜索、分类、价格筛选与个性化推荐。
        </p>
      </section>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_0.6fr_0.6fr_1fr_auto]">
          <Input
            placeholder="搜索商品名称或描述"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyFilters();
            }}
          />
          <Select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">全部分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={0}
            placeholder="最低价"
            value={minPriceInput}
            onChange={(event) => setMinPriceInput(event.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="最高价"
            value={maxPriceInput}
            onChange={(event) => setMaxPriceInput(event.target.value)}
          />
          <Select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortOption);
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button onClick={applyFilters}>搜索</Button>
            <Button variant="outline" onClick={resetFilters}>
              重置
            </Button>
          </div>
        </div>
        {hasFilters ? (
          <p className="mt-2 text-xs text-zinc-500">
            已应用筛选条件，可点击“重置”查看全部商品。
          </p>
        ) : null}
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          {hasFilters ? '筛选结果' : '全部商品'}
        </h2>
        {!isLoading && !error ? <p className="text-xs text-zinc-500">共 {total} 件商品</p> : null}
      </div>

      {isLoading ? (
        <FullPageLoading label="正在加载商品..." />
      ) : error ? (
        <ErrorState
          title="商品加载失败"
          description={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title={hasFilters ? '没有符合条件的商品' : '暂无在售商品'}
          description={
            hasFilters
              ? '尝试调整关键词、分类或价格区间后重新搜索。'
              : '商家上架商品后，这里会自动展示。'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                清空筛选
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}

      {!hasFilters ? <RecommendedProducts /> : null}
    </div>
  );
}
