import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 课程作业：Vite 负责前端构建，不引入 Node/Express 服务端。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  }
});
