/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'jspdf'],
    outputFileTracingIncludes: {
      '/**/*': ['./prisma/dev.db'],
    },
  },
};

export default nextConfig;
