import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
};

/** @type {import('next').NextConfig} */
const nextConfig = withPWA(pwaConfig)({
  reactStrictMode: true,
});

export default nextConfig;
