import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 允许局域网设备(手机真机测试)访问 dev 资源,否则 HMR/字体请求会被跨域策略拦截
  allowedDevOrigins: ['10.20.0.107'],
};

export default nextConfig;
