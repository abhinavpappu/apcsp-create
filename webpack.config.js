const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: {
    index: './src/main.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            scss: 'vue-style-loader!css-loader!postcss-loader!sass-loader',
            sass: 'vue-style-loader!css-loader!postcss-loader!sass-loader?indentedSyntax',
          },
        },
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: {
      vue$: 'vue/dist/vue.esm.js',
    },
  },
  devServer: {
    noInfo: true,
    overlay: true,
  },
  devtool: '#eval-source-map',
};

if (process.env.NODE_ENV === 'production') {
  module.exports.devtool = '#source-map';
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new UglifyJsPlugin({
      sourceMap: true,
      uglifyOptions: {
        mangle: {
          safari10: true,
        },
      },
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
    }),
  ]);
}
