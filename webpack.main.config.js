const path = require("path");
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');     



module.exports = env => {

  return {     
      
      mode:env,

      context:__dirname,

      entry: './main.ts', 

      output: { 
        filename: 'main.js',
        path: path.resolve(__dirname, env)
      }, 

      target: 'electron-main', 

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
      }
      
  }

};