// 课程作业：AuthProvider 负责 Supabase Session 与商城资料/商家角色的全局状态。
// 认证会话变化只更新状态；资料查询放在独立 effect 中，避免在回调内阻塞 Supabase Auth。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseSetupError } from '../../lib/supabase';
import { getErrorMessage } from '../../lib/errors';
import type { ShopProfile } from '../../types/models';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ShopProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  authError: string | null;
  profileError: string | null;
  isMerchant: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileRequestId = useRef(0);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!supabase) {
      setAuthError(supabaseSetupError);
      setIsLoading(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(getErrorMessage(error));
        setSession(data.session ?? null);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthError(getErrorMessage(error));
        setIsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setIsLoading(false);
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const requestId = ++profileRequestId.current;

    if (!supabase || !userId) {
      setProfile(null);
      setProfileError(null);
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    setProfileError(null);

    const { data, error } = await supabase
      .from('shop_profiles')
      .select('id, display_name, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (requestId !== profileRequestId.current) return;

    if (error) {
      setProfile(null);
      setProfileError(getErrorMessage(error));
    } else if (!data) {
      setProfile(null);
      setProfileError('商城用户资料尚未初始化，请退出后重新登录或联系管理员');
    } else {
      setProfile(data as ShopProfile);
    }

    setIsProfileLoading(false);
  }, [userId]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error(supabaseSetupError ?? 'Supabase 尚未完成配置');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setProfileError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isProfileLoading,
      authError,
      profileError,
      isMerchant: profile?.role === 'merchant',
      refreshProfile,
      signOut
    }),
    [
      session,
      profile,
      isLoading,
      isProfileLoading,
      authError,
      profileError,
      refreshProfile,
      signOut
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
}
