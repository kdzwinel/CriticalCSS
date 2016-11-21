(function () {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    const leafs = Array.from(document.querySelectorAll('*')).filter(el => el.children.length === 0);
    let leaf;

    while (leaf = leafs.pop()) {
        const bcr = leaf.getBoundingClientRect();

        if (bcr.top > maxHeight || bcr.left > maxWidth) {
            const parentNode = leaf.parentNode;
            parentNode.removeChild(leaf);

            if (parentNode.children.length === 0) {
                leafs.push(parentNode);
            }
        }
    }
})();
