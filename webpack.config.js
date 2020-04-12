/* eslint-disable import/no-commonjs */

const path = require('path');

// Loaders
const babelLoader = {
  loader: 'babel-loader',
  options: {
    configFile: false,
    babelrc: false,
    // Babel preset ordering is reversed (last to first).
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current'
          },
          modules: false
        }
      ],
      '@babel/preset-typescript'
    ]
  }
};

// Config
module.exports = (env) => ({
  mode: env,
  target: 'node',
  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'build/'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [babelLoader]
      }
    ]
  }
});
