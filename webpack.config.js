const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@services": path.resolve(__dirname, "src/services/"),
      "@typings": path.resolve(__dirname, "src/types/"),
      "@utils": path.resolve(__dirname, "src/utils/"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude:
          /node_modules\/(?!(bellajs|@extractus\/article-extractor)\/).*/,
      },
      {
        test: /\.js$/,
        exclude:
          /node_modules\/(?!(bellajs|@extractus\/article-extractor)\/).*/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  target: "node",
  plugins: [
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_fnames: /AbortSignal/,
        },
      }),
    ],
  },
};
