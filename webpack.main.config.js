const path = require("path");

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = env => [{

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

  },

    {

      entry: {
        "app":"./app/app.tsx"
      },

      mode:env,

      output: {
        filename : "[name].js" ,
        path : path.resolve(__dirname,env)
      },

      resolve: {
        extensions: [".ts", ".tsx", ".js", ".json", ".css"]
      },

      module: {
        rules: [
          {
            test: /\.(css|scss)$/,
            use: [ 'style-loader', 'css-loader']
          },
          {
            test:/\.(ts|tsx)?$/,
            exclude: path.resolve(__dirname,'node_modules'),
            loader:"awesome-typescript-loader"
          },
          {
            test   : /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
            loader: "file-loader"
          },
          {
            test: /\.(js|jsx)$/,
            loader: "babel-loader",
            exclude: /node_modules/
          }
        ]
      },

      target:"electron-renderer", //"web"

      plugins: [
        new CopyWebpackPlugin([{ from : "./app/assets" }]),
        new HtmlWebpackPlugin({
          inject:true,
          title:"NIFTI Viewer",
          chunks:["app"],
          filename:"app.html"
        })
      ],

      node: {
        __dirname: false,
        __filename: false
      }

    }
    ];
