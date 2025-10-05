/** @type {import('next').NextConfig} */
const nextConfig = {
    serverComponentsExternalPackages: ['serialport', '@serialport/bindings-cpp'],
  };
  
  export default nextConfig;