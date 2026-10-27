/** @type {import('next').NextConfig} */
const nextConfig = {
  // Specify workspace root for Turbopack
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
