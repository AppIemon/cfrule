import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 상위 저장소(채끄)에도 lockfile 이 있어, 이 앱의 루트를 못 박아 둔다.
  turbopack: { root: import.meta.dirname }
};

export default nextConfig;
