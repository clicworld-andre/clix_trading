/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint checking
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript checking
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for @matrix-org/olm requiring 'fs' and other Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        // Use false for all Node.js built-in modules instead of polyfills
        crypto: false,
        stream: false,
        path: false,
      };
    }
    
    // Use externals to ignore the matrix-js-sdk in SSR
    if (isServer) {
      config.externals = [...(config.externals || []), 'matrix-js-sdk'];
    }

    // Handle Stellar SDK and crypto library warnings
    config.ignoreWarnings = [
      // Ignore critical dependency warnings from crypto libraries
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      /Critical dependency: the request of a dependency is an expression/,
      // Specific ignores for stellar/sodium-native packages
      /node_modules\/sodium-native/,
      /node_modules\/require-addon/,
      /node_modules\/@stellar\/stellar-base/,
    ];

    // Exclude problematic modules from being processed by webpack in client
    if (!isServer) {
      config.externals = {
        ...config.externals,
        'sodium-native': 'sodium-native',
      };
    }
    
    return config;
  },
}

export default nextConfig