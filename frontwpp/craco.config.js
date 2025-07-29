module.exports = {
  devServer: {
    allowedHosts: 'all',
    host: 'localhost',
    port: 3000,
    client: {
      webSocketURL: 'ws://localhost:3000/ws',
    },
    hot: true,
    liveReload: true,
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
      
      // Configurar hot reload corretamente
      if (webpackConfig.devServer) {
        webpackConfig.devServer.hot = true;
        webpackConfig.devServer.liveReload = true;
      }
      
      return webpackConfig;
    },
  },
}; 