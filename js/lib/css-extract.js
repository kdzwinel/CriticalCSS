function removeRuleText(css, range) {
    const {startLine, endLine, startColumn, endColumn} = range;

    for (let i = startLine; i <= endLine; i++) {
        if (i === startLine) {

            if (startLine === endLine) {
                css[i] = css[i].substring(0, startColumn) + ' '.repeat(endColumn - startColumn) + css[i].substring(endColumn);
            } else {
                css[i] = css[i].substring(0, startColumn);
            }

        } else if (i === endLine) {
            css[i] = ' '.repeat(endColumn) + css[i].substring(endColumn);
        } else {
            css[i] = '';
        }
    }

    return css;
}
