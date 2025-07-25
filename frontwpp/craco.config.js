module.exports = {
  devServer: {
    allowedHosts: 'all',
    host: 'localhost',
    port: 3000,
    client: {
      webSocketURL: 'ws://localhost:3000/ws',
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Resolve problemas de compatibilidade
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "fs": false,
        "path": false,
        "os": false,
      };
      return webpackConfig;
    },
  },
}; 