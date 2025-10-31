import type { NextConfig } from "next";

// Default to Docker service name; override via NEXT_PUBLIC_BACKEND_ORIGIN when running frontend on host
const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://ai_interview_backend:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // If frontend runs inside Docker, set NEXT_PUBLIC_BACKEND_ORIGIN=http://ai_interview_backend:8080
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
