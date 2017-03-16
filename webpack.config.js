const autoprefixer = require('autoprefixer');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './lib/vcms.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'ec-vcms.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
      },
      {
        test: /\.(scss|sass)$/,
        loader: ExtractTextPlugin.extract('raw-loader!postcss-loader!sass-loader'),
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader!css-loader'),
      },
      {
        test: /\.html$/,
        loader: 'raw-loader',
      },
    ],
  },
  plugins: [
    new ExtractTextPlugin({
      filename: 'ec-vcms.css',
      allChunks: false,
    }),
    new OptimizeCssAssetsPlugin({
      cssProcessor: require('cssnano'),
      cssProcessorOptions: {
        discardComments: {
          removeAll: true,
        },
        discardDuplicates: {
          removeAll: true,
        },
      },
      canPrint: false,
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
      output: {
        comments: false,
      },
    }),
    new webpack.LoaderOptionsPlugin({
      options: {
        babel: {
          presets: ['es2015'],
        },
        postcss: [
          autoprefixer({
            browsers: ['last 2 version'],
          }),
        ],
      },
    }),
  ],
};
