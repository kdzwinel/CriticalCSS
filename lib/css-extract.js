function getRuleSelector(css, range) {
    const {startLine, startColumn} = range;
    let hasOpened = false;
    let ruleSelector = '';

    for(let y = startLine; y >= 0 ; y--) {
        const startPosition = (y === startLine) ? startColumn - 1 : css[y].length - 1;

        for(let x = startPosition; x >= 0; x--) {
            if (!hasOpened && css[y][x] === '{') {
                hasOpened = true;
            } else if (css[y][x] === '}' || css[y][x] === '{') {
                return ruleSelector.trim();
            } else {
                ruleSelector = css[y][x] + ruleSelector;
            }
        }
    }

    return ruleSelector.trim();
}

function getRuleText(css, range) {
    const {startLine, endLine, startColumn, endColumn} = range;
    let ruleText = '';

    for(let i = startLine; i <= endLine; i++) {
        if (i === startLine) {

            if(startLine === endLine) {
                ruleText += css[i].substr(startColumn, endColumn - startColumn);
            } else {
                ruleText += css[i].substr(startColumn);
            }

        } else if (i === endLine) {
            ruleText += css[i].substr(0, endColumn);
        } else {
            ruleText += css[i];
        }
    }

    return ruleText.trim();
}