import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Baked into both the client bundle and the server at build time, so a
    // tab that loaded an old deployment keeps the old value in memory while
    // /api/version (re-read on every request) reflects whatever is live —
    // that mismatch is how the update-available check works.
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()),
  },
};

export default nextConfig;
