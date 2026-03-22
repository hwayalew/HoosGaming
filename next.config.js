/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['phaser'],
  allowedDevOrigins: ['*.replit.dev', '*.spock.replit.dev', '*.replit.app'],
};

module.exports = nextConfig;
