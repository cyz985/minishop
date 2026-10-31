// 课程作业：全局路由表。
// 公共路由、登录保护路由、商家保护路由；阶段 4 已全部替换为真实业务页面。

import { createBrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { MerchantRoute, ProtectedRoute } from './features/auth/guards';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { AddressesPage } from './features/addresses/AddressesPage';
import { CartPage } from './features/cart/CartPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { CouponsPage } from './features/coupons/CouponsPage';
import { MerchantHomePage } from './features/merchant/MerchantHomePage';
import { MerchantOrderDetailPage } from './features/merchant/MerchantOrderDetailPage';
import { MerchantOrdersPage } from './features/merchant/MerchantOrdersPage';
import { MerchantProductFormPage } from './features/merchant/MerchantProductFormPage';
import { MerchantProductsPage } from './features/merchant/MerchantProductsPage';
import { LogisticsPage } from './features/orders/LogisticsPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { ProductsPage } from './features/products/ProductsPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

function protectedPage(node: ReactNode): ReactNode {
  return <ProtectedRoute>{node}</ProtectedRoute>;
}

function merchantPage(node: ReactNode): ReactNode {
  return <MerchantRoute>{node}</MerchantRoute>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // ---------- 公共页面 ----------
      {
        index: true,
        element: <ProductsPage />
      },
      {
        path: 'products/:id',
        element: <ProductDetailPage />
      },
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'register',
        element: <RegisterPage />
      },
      { path: '403', element: <ForbiddenPage /> },

      // ---------- 需要登录的页面 ----------
      {
        path: 'cart',
        element: protectedPage(<CartPage />)
      },
      {
        path: 'addresses',
        element: protectedPage(<AddressesPage />)
      },
      {
        path: 'checkout',
        element: protectedPage(<CheckoutPage />)
      },
      {
        path: 'orders',
        element: protectedPage(<OrdersPage />)
      },
      {
        path: 'orders/:id',
        element: protectedPage(<OrderDetailPage />)
      },
      {
        path: 'orders/:id/logistics',
        element: protectedPage(<LogisticsPage />)
      },
      {
        path: 'coupons',
        element: protectedPage(<CouponsPage />)
      },

      // ---------- 商家后台 ----------
      {
        path: 'merchant',
        element: merchantPage(<MerchantHomePage />)
      },
      {
        path: 'merchant/products',
        element: merchantPage(<MerchantProductsPage />)
      },
      {
        path: 'merchant/products/new',
        element: merchantPage(<MerchantProductFormPage />)
      },
      {
        path: 'merchant/products/:id/edit',
        element: merchantPage(<MerchantProductFormPage />)
      },
      {
        path: 'merchant/orders',
        element: merchantPage(<MerchantOrdersPage />)
      },
      {
        path: 'merchant/orders/:id',
        element: merchantPage(<MerchantOrderDetailPage />)
      },

      // ---------- 兜底 ----------
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);
