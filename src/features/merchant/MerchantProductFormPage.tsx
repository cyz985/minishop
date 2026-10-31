// 课程作业：商家新增 / 编辑商品（扩展功能）。
// 新增时写入 shop_products 并同步多图；编辑时更新商品信息并重建图片列表。

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import type {
  ShopCategory,
  ShopProduct,
  ShopProductImage
} from '../../types/models';

export function MerchantProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryText, setGalleryText] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const client = requireSupabase();
        const { data: categoryData, error: categoryError } = await client
          .from('shop_categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!active) return;
        if (categoryError) throw categoryError;
        setCategories((categoryData ?? []) as ShopCategory[]);

        if (!id) {
          setIsLoading(false);
          return;
        }

        const [productResult, imageResult] = await Promise.all([
          client.from('shop_products').select('*').eq('id', id).maybeSingle(),
          client
            .from('shop_product_images')
            .select('*')
            .eq('product_id', id)
            .order('sort_order', { ascending: true })
        ]);

        if (!active) return;
        if (productResult.error) throw productResult.error;

        if (!productResult.data) {
          setLoadError('商品不存在或无权编辑');
          setIsLoading(false);
          return;
        }

        const product = productResult.data as ShopProduct;
        setName(product.name);
        setDescription(product.description);
        setPrice(String(product.price));
        setStock(String(product.stock));
        setCategoryId(product.category_id ?? '');
        setCoverImageUrl(product.cover_image_url ?? '');
        setIsActive(product.is_active);

        if (!imageResult.error) {
          const images = (imageResult.data ?? []) as ShopProductImage[];
          setGalleryText(images.map((image) => image.image_url).join('\n'));
        }

        setIsLoading(false);
      } catch (loadFailure) {
        if (!active) return;
        setLoadError(getErrorMessage(loadFailure));
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setFormError('商品名称需为 1-80 个字符');
      return;
    }

    const priceValue = Number(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setFormError('请输入合法的商品价格（不小于 0）');
      return;
    }

    const stockValue = Number(stock);
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setFormError('库存需为不小于 0 的整数');
      return;
    }

    const imageUrls = galleryText
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const invalidImage = imageUrls.find((url) => !/^https?:\/\//i.test(url));
    if (invalidImage) {
      setFormError(`图片地址必须以 http(s):// 开头：${invalidImage}`);
      return;
    }

    if (coverImageUrl.trim() && !/^https?:\/\//i.test(coverImageUrl.trim())) {
      setFormError('封面图地址必须以 http(s):// 开头');
      return;
    }

    setIsSaving(true);
    try {
      const client = requireSupabase();
      const payload = {
        name: trimmedName,
        description: description.trim(),
        price: priceValue,
        stock: stockValue,
        category_id: categoryId || null,
        cover_image_url: coverImageUrl.trim() || null,
        is_active: isActive
      };

      let productId = id ?? null;

      if (isEdit && id) {
        const { error: updateError } = await client
          .from('shop_products')
          .update(payload)
          .eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await client
          .from('shop_products')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select('id')
          .single();
        if (insertError) throw insertError;
        productId = (data as { id: string }).id;
      }

      if (!productId) throw new Error('商品保存失败，未能获取商品 ID');

      // 多图采用“先删后插”，保证编辑后的图片顺序与文本域一致。
      const { error: deleteError } = await client
        .from('shop_product_images')
        .delete()
        .eq('product_id', productId);
      if (deleteError) throw deleteError;

      if (imageUrls.length > 0) {
        const { error: imageError } = await client.from('shop_product_images').insert(
          imageUrls.map((url, index) => ({
            product_id: productId,
            image_url: url,
            sort_order: index
          }))
        );
        if (imageError) throw imageError;
      }

      showToast({
        tone: 'success',
        title: isEdit ? '商品已更新' : '商品已创建',
        description: trimmedName
      });
      navigate('/merchant/products');
    } catch (saveError) {
      setFormError(getErrorMessage(saveError));
      showToast({ tone: 'error', title: '保存失败', description: getErrorMessage(saveError) });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <FullPageLoading label="正在加载商品信息..." />;

  if (loadError) {
    return (
      <div className="space-y-4 py-4">
        <ErrorState
          title="无法打开商品表单"
          description={loadError}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <div className="text-center">
          <Link
            to="/merchant/products"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            返回商品管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? '编辑商品' : '新增商品'}
        description="商品信息保存后会立即同步到用户端商品列表。"
        actions={
          <Link
            to="/merchant/products"
            className="focus-ring inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-brand-400"
          >
            返回商品管理
          </Link>
        }
      />

      <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <h2 className="text-base font-semibold text-zinc-900">基础信息</h2>

            <Input
              label="商品名称"
              value={name}
              maxLength={80}
              placeholder="例如：无线蓝牙耳机"
              onChange={(event) => setName(event.target.value)}
            />

            <Textarea
              label="商品描述"
              rows={5}
              value={description}
              placeholder="介绍商品卖点、规格与使用场景"
              onChange={(event) => setDescription(event.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="价格（元）"
                type="number"
                min="0"
                step="0.01"
                value={price}
                placeholder="0.00"
                onChange={(event) => setPrice(event.target.value)}
              />
              <Input
                label="库存（件）"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="商品分类"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">不指定分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                label="上架状态"
                value={isActive ? 'active' : 'inactive'}
                onChange={(event) => setIsActive(event.target.value === 'active')}
              >
                <option value="active">立即上架</option>
                <option value="inactive">暂不上架</option>
              </Select>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">商品图片</h2>
              <p className="mt-1 text-xs text-zinc-500">
                第一张图会作为列表封面，建议使用可直接访问的图片链接。
              </p>
            </div>

            <Input
              label="封面图地址"
              value={coverImageUrl}
              placeholder="https://example.com/cover.jpg"
              onChange={(event) => setCoverImageUrl(event.target.value)}
            />

            <Textarea
              label="详情多图地址"
              rows={5}
              value={galleryText}
              hint="每行一个图片地址，按顺序展示在商品详情页。"
              placeholder={'https://example.com/1.jpg\nhttps://example.com/2.jpg'}
              onChange={(event) => setGalleryText(event.target.value)}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-zinc-900">保存</h2>
            {formError ? <Alert tone="error">{formError}</Alert> : null}
            <Button type="submit" className="w-full" isLoading={isSaving}>
              {isEdit ? '保存修改' : '创建商品'}
            </Button>
            <Link
              to="/merchant/products"
              className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:border-brand-400"
            >
              取消
            </Link>
          </Card>

          <Card className="space-y-2 p-5 text-xs text-zinc-500">
            <h3 className="text-sm font-semibold text-zinc-900">填写提示</h3>
            <p>· 名称、价格、库存为必填项。</p>
            <p>· 库存为 0 时商品在用户端显示“已售罄”。</p>
            <p>· 下架商品仅商家后台可见。</p>
          </Card>
        </div>
      </form>
    </div>
  );
}
