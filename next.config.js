/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['scontent.fbcdn.net', 'lookaside.fbsbx.com', 'external.fbcdn.net'],
  },
};

module.exports = nextConfig;
