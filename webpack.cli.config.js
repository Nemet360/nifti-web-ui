const path = require("path");
const webpack = require("webpack");


module.exports = env => {

  return {

      mode:env,

      context:__dirname  + "/cli",

      entry: './index.ts',

      output: {
        filename: 'cli.js',
        path: path.resolve(__dirname, env)
      },

      target: 'node',

      resolve: {
        extensions: ['.js', '.ts', '.tsx', '.jsx']
      },

      devtool:'source-map',

      module: {
        rules:[
          {
            test:/\.ts$/,
            exclude: /(node_modules)/,
            loader:"awesome-typescript-loader"
          },
          {
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /(node_modules|bower_components|\.spec\.js)/,
            options: {
              presets: ["@babel/env"],
              plugins: [
                "@babel/plugin-proposal-object-rest-spread",
                ["@babel/plugin-proposal-decorators", {"legacy": true}],
                "@babel/plugin-proposal-class-properties"
              ]
            }
          }
        ]
      },

      node: {
        __dirname: false,
        __filename: false,
      },
      plugins: [
        new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
      ]

  }

};
