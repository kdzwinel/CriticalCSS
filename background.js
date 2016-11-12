let tabDebugger = null;

function processData(data) {
    if (!data || !Array.isArray(data.ruleUsage)) {
        return null;
    }

    return new Promise((resolve, reject) => {
        const usedRules = data.ruleUsage.filter(rule => rule.used);
        const stylesheets = new Set();

        usedRules.forEach(rule => stylesheets.add(rule.styleSheetId));

        // pull all stylesheets used
        const stylesheetsTextReady = Promise.all(
            Array.from(stylesheets)
                .map(styleSheetId => {
                    return tabDebugger.sendCommand('CSS.getStyleSheetText', {styleSheetId})
                        .then(({text}) => {
                            return {styleSheetId, text}
                        });
                })
        );

        stylesheetsTextReady.then(stylesheetsText => {
            const cssMap = new Map();
            stylesheetsText.forEach(({styleSheetId, text}) => cssMap.set(styleSheetId, text.split(/\n\r?/)));

            const outputCSS = usedRules.map(rule => {
                const css = cssMap.get(rule.styleSheetId);
                const ruleText = getRuleText(css, rule.range);
                const ruleSelector = getRuleSelector(css, rule.range);

                return `${ruleSelector} { ${ruleText} }`;
            });

            resolve(outputCSS);
        })
    });
}

function startRecording(tabId) {
    chrome.browserAction.setBadgeText({text: 'rec'});

    tabDebugger = new TabDebugger(tabId);

    tabDebugger.connect()
        .then(() => injectCode({file: 'injected/hide-below-the-fold.js'}))
        .then(() => tabDebugger.sendCommand('DOM.enable'))
        .then(() => tabDebugger.sendCommand('CSS.enable'))
        .then(() => tabDebugger.sendCommand('CSS.startRuleUsageTracking'))
        .catch(error => {
            console.error(error);
            stopRecording();
        });
}

function stopRecording() {
    chrome.browserAction.setBadgeText({text: ''});

    if(!tabDebugger || !tabDebugger.isConnected()) {
        tabDebugger = null;
        return;
    }

    tabDebugger.sendCommand('CSS.stopRuleUsageTracking')
        .then(processData)
        .then(outputCSS => {

            chrome.tabs.create({
                url: window.URL.createObjectURL(new Blob([outputCSS.join('\n')], {type: 'text/plain'})),
                active: false
            });

            chrome.tabs.executeScript({
                file: 'injected/remove-all-styles.js'
            }, () => {

                chrome.tabs.executeScript({
                    code: `
                (function() {
                    let link = document.createElement('style');
                    link.textContent = \`${outputCSS.join('')}\`;
                    document.head.appendChild(link);
                })();
                `
                });

                tabDebugger.disconnect();
                tabDebugger = null;
            });

        })
        .catch(error => console.error(error));
}

function handleActionButtonClick(tab) {
    if (!tabDebugger) {
        startRecording(tab.id);
    } else {
        stopRecording();
    }
}

chrome.browserAction.setBadgeBackgroundColor({color: "#F00"});
chrome.browserAction.onClicked.addListener(handleActionButtonClick);