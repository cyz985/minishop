// 课程作业：Supabase 客户端封装。
// 注意：缺少 .env 或配置错误时不能 throw 导致白屏。
// 本模块只创建客户端并暴露配置错误，由 App 显示友好提示。

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

let setupError: string | null = null;
let client: SupabaseClient | null = null;

if (!rawUrl && !rawKey) {
  setupError = '缺少 Supabase 环境变量：VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY';
} else if (!rawUrl) {
  setupError = '缺少 Supabase 环境变量：VITE_SUPABASE_URL';
} else if (!rawKey) {
  setupError = '缺少 Supabase 环境变量：VITE_SUPABASE_ANON_KEY';
} else if (!isValidHttpUrl(rawUrl)) {
  setupError = 'VITE_SUPABASE_URL 不是有效的 http/https 地址，请检查 .env';
} else {
  try {
    client = createClient(rawUrl, rawKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    setupError =
      error instanceof Error
        ? `Supabase 客户端初始化失败：${error.message}`
        : 'Supabase 客户端初始化失败，请检查 .env';
    client = null;
  }
}

/** 可能为 null：页面必须先检查配置状态，不要直接解引用。 */
export const supabase = client;

/** 配置加载/初始化失败时的用户可读原因。 */
export const supabaseSetupError = setupError;

/** 配置是否完整可用。 */
export const isSupabaseConfigured = client !== null;

/**
 * 仅用于确实需要客户端的操作函数。
 * 调用方应捕获错误并向用户展示提示，不能让其造成页面白屏。
 */
export function requireSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(supabaseSetupError ?? 'Supabase 尚未完成配置');
  }
  return client;
}
