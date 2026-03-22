/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hostnames only (no protocol/port). Lets dev assets load when opened via Network URL
  // (e.g. http://0.0.0.0:5001) or your LAN IP — add your machine IP if you use it in the browser.
  allowedDevOrigins: [
    '*.replit.dev',
    '*.spock.replit.dev',
    '*.replit.app',
    '0.0.0.0',
  ],
};

module.exports = nextConfig;
