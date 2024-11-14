const path = require('path');

module.exports = {
    entry: './background.js',  // Your background script entry
    output: {
        filename: 'bundle.js',  // Output to `dist/bundle.js`
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'development',  // You can also try 'development' if testing
    devtool: 'inline-source-map',  // Avoids `eval` in source maps
    resolve: {
        fallback: {
            "fs": false,  // Ensure no node-specific modules are included
        }
    },
    optimization: {
        minimize: false,  // For easier debugging; set to `true` if desired
    },
};
