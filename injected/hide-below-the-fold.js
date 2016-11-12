(function() {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;

    Array.from(document.body.querySelectorAll('*')).forEach(el => {
        const bcr = el.getBoundingClientRect();

        if (bcr.top > maxHeight || bcr.left > maxWidth) {
            el.parentNode.removeChild(el);
        }
    });
})();