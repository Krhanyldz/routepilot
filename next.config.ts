import type { NextConfig } from "next";
import { browserSecurityHeaders } from "./src/server/browser-security-policy";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [...browserSecurityHeaders],
    }];
  },
};

export default nextConfig;
