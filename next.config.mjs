/** @type {import('next').NextConfig} */
const storefront = process.env.STOREFRONT_ORIGIN || 'http://localhost:3000';

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Resolve relative catalog/media paths against the storefront in local/dev.
    // YWJE heroes live at /products/ywje/... on the storefront public folder.
    return [
      { source: '/products/ywje/:path*', destination: `${storefront}/products/ywje/:path*` },
      { source: '/products/lotusfun/:path*', destination: `${storefront}/products/lotusfun/:path*` },
      { source: '/lotusfun/:path*', destination: `${storefront}/lotusfun/:path*` },
      { source: '/bracelets/:path*', destination: `${storefront}/bracelets/:path*` },
      { source: '/brooch/:path*', destination: `${storefront}/brooch/:path*` },
      { source: '/categories/:path*', destination: `${storefront}/categories/:path*` },
      { source: '/chains/:path*', destination: `${storefront}/chains/:path*` },
      { source: '/earrings/:path*', destination: `${storefront}/earrings/:path*` },
      { source: '/frames/:path*', destination: `${storefront}/frames/:path*` },
      { source: '/hero/:path*', destination: `${storefront}/hero/:path*` },
      { source: '/images/:path*', destination: `${storefront}/images/:path*` },
      { source: '/necklace/:path*', destination: `${storefront}/necklace/:path*` },
      { source: '/rings/:path*', destination: `${storefront}/rings/:path*` },
      { source: '/YIWU Products/:path*', destination: `${storefront}/YIWU%20Products/:path*` },
    ];
  },
};

export default nextConfig;
