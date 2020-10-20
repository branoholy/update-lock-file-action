/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */

const path = require('path');

// Config
module.exports = ({ production, development }) => ({
  mode: production ? 'production' : development ? 'development' : 'unknown',
  target: 'node12',
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
        use: ['babel-loader']
      }
    ]
  }
});
