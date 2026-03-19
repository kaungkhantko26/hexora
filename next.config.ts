import type { NextConfig } from "next";

const useGithubPagesPath = process.env.GH_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? process.env.GH_PAGES_REPO ?? "hexora";
const isUserOrOrgSite = repoName?.toLowerCase().endsWith(".github.io");
const basePath = useGithubPagesPath && repoName && !isUserOrOrgSite ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
};

export default nextConfig;
