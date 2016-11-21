const CleanCSS = require('clean-css');
const postcss = require('postcss');
const postcssURL = require('postcss-url');
const url = require('url');

window.CleanCSS = CleanCSS;
window.rebaseURLs = (css, callback) => {
    return postcss()
        .use(postcssURL({
            url: callback
        }))
        .process(css, {})
        .css;
};
window.urlResolve = url.resolve.bind(url);
