// 课程作业：收货地址管理。
// 新增 / 编辑 / 删除 / 设为默认；默认地址由数据库触发器维护唯一性。

import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FullPageLoading } from '../../components/ui/FullPageLoading';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { requireSupabase } from '../../lib/supabase';
import type { ShopAddress } from '../../types/models';

interface AddressFormState {
  receiver_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
}

const emptyForm: AddressFormState = {
  receiver_name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false
};

export function AddressesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<ShopAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<ShopAddress | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<AddressFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await requireSupabase()
        .from('shop_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (!active) return;

      if (queryError) {
        setError(getErrorMessage(queryError));
      } else {
        setAddresses((data ?? []) as ShopAddress[]);
      }
      setIsLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(address: ShopAddress) {
    setEditing(address);
    setForm({
      receiver_name: address.receiver_name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      is_default: address.is_default
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!user) return;
    if (!form.receiver_name.trim()) {
      setFormError('请填写收货人姓名');
      return;
    }
    if (form.phone.trim().length < 6) {
      setFormError('请填写有效的联系电话');
      return;
    }
    if (!form.detail.trim()) {
      setFormError('请填写详细地址');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        receiver_name: form.receiver_name.trim(),
        phone: form.phone.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        detail: form.detail.trim(),
        is_default: form.is_default
      };

      if (editing) {
        const { error: updateError } = await requireSupabase()
          .from('shop_addresses')
          .update(payload)
          .eq('id', editing.id);
        if (updateError) throw updateError;
        showToast({ tone: 'success', title: '地址已更新' });
      } else {
        const { error: insertError } = await requireSupabase()
          .from('shop_addresses')
          .insert(payload);
        if (insertError) throw insertError;
        showToast({ tone: 'success', title: '地址已添加' });
      }

      setIsFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setFormError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function setDefault(address: ShopAddress) {
    setBusyId(address.id);
    try {
      const { error: updateError } = await requireSupabase()
        .from('shop_addresses')
        .update({ is_default: true })
        .eq('id', address.id);
      if (updateError) throw updateError;
      showToast({ tone: 'success', title: '已设为默认地址' });
      setReloadKey((key) => key + 1);
    } catch (updateError) {
      showToast({ tone: 'error', title: '设置失败', description: getErrorMessage(updateError) });
    } finally {
      setBusyId(null);
    }
  }

  async function removeAddress(address: ShopAddress) {
    if (!window.confirm(`确定删除收货人「${address.receiver_name}」的地址吗？`)) return;

    setBusyId(address.id);
    try {
      const { error: deleteError } = await requireSupabase()
        .from('shop_addresses')
        .delete()
        .eq('id', address.id);
      if (deleteError) throw deleteError;
      showToast({ tone: 'success', title: '地址已删除' });
      setReloadKey((key) => key + 1);
    } catch (deleteError) {
      showToast({ tone: 'error', title: '删除失败', description: getErrorMessage(deleteError) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="收货地址"
        description="下单时选择一个地址，默认地址会优先展示。"
        actions={<Button onClick={openCreateForm}>新增地址</Button>}
      />

      {isFormOpen ? (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            {editing ? '编辑地址' : '新增地址'}
          </h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {formError ? <Alert tone="error">{formError}</Alert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="收货人"
                required
                maxLength={30}
                value={form.receiver_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, receiver_name: event.target.value }))
                }
                placeholder="请输入收货人姓名"
              />
              <Input
                label="联系电话"
                required
                maxLength={20}
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="手机号或固定电话"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="省份"
                maxLength={30}
                value={form.province}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, province: event.target.value }))
                }
                placeholder="例如：广东省"
              />
              <Input
                label="城市"
                maxLength={30}
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="例如：深圳市"
              />
              <Input
                label="区/县"
                maxLength={30}
                value={form.district}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, district: event.target.value }))
                }
                placeholder="例如：南山区"
              />
            </div>
            <Textarea
              label="详细地址"
              required
              rows={3}
              maxLength={200}
              value={form.detail}
              onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))}
              placeholder="街道、门牌号、楼栋与房间号"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_default: event.target.checked }))
                }
                className="h-4 w-4 rounded border-zinc-300 text-brand-600"
              />
              设为默认地址
            </label>
            <div className="flex gap-2">
              <Button type="submit" isLoading={isSaving}>
                保存地址
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditing(null);
                  setForm(emptyForm);
                  setFormError(null);
                }}
              >
                取消
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading ? (
        <FullPageLoading label="正在加载地址..." />
      ) : error ? (
        <ErrorState
          title="地址加载失败"
          description={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          title="还没有收货地址"
          description="添加地址后即可在结算时选择。"
          action={<Button onClick={openCreateForm}>新增地址</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {address.receiver_name}
                    <span className="ml-2 font-normal text-zinc-500">{address.phone}</span>
                  </p>
                  {address.is_default ? (
                    <Badge tone="brand" className="mt-2">
                      默认地址
                    </Badge>
                  ) : null}
                </div>
              </div>
              <p className="text-sm leading-6 text-zinc-600">
                {[address.province, address.city, address.district, address.detail]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                {!address.is_default ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={busyId === address.id}
                    onClick={() => void setDefault(address)}
                  >
                    设为默认
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => openEditForm(address)}>
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={busyId === address.id}
                  onClick={() => void removeAddress(address)}
                >
                  删除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
