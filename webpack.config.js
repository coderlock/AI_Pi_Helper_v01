const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  target: 'electron-renderer',
  
  entry: './src/renderer/renderer.ts',
  
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'renderer.bundle.js'
  },
  
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  
  resolve: {
    extensions: ['.ts', '.js', '.css']
  },
  
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'src/renderer/index.html', 
          to: 'index.html'
        },
        { 
          from: 'src/renderer/styles', 
          to: 'styles'
        }
      ]
    })
  ],
  
  devtool: 'source-map',
  
  // Externals for Electron builtins if needed
  externals: {
    electron: 'commonjs electron'
  }
};
