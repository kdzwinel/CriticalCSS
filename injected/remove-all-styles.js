(function () {
    Array.from(document.querySelectorAll('link[rel=stylesheet], style'))
        .forEach(link => link.parentNode.removeChild(link));
})();