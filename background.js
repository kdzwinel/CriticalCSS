let tabDebugger = null;
let currentTab = null;
let stylesheetsMeta = [];
const cleanCSS = new CleanCSS({
    keepSpecialComments: 0
});

function collectStylesheets(source, method, params) {
    if (method === 'CSS.styleSheetAdded' && params.header) {
        stylesheetsMeta.push(params.header);
    }
}

async function processData(data) {
    if (!data || !Array.isArray(data.ruleUsage)) {
        return null;
    }

    const usedRules = data.ruleUsage.filter(rule => rule.used);
    const notUsedRules = data.ruleUsage.filter(rule => !rule.used);
    const stylesheets = new Set();

    usedRules.forEach(rule => stylesheets.add(rule.styleSheetId));

    // pull all stylesheets used
    const stylesheetsText = await Promise.all(
        Array.from(stylesheets)
            .map(styleSheetId =>
                tabDebugger.sendCommand('CSS.getStyleSheetText', {styleSheetId})
                    .then(({text}) => ({styleSheetId, text}))
            )
    );

    const cssMap = new Map();
    stylesheetsText.forEach(({styleSheetId, text}) => cssMap.set(styleSheetId, text.split(/\n\r?/)));

    notUsedRules.forEach(rule => {
        const css = cssMap.get(rule.styleSheetId);

        if (css) {
            cssMap.set(rule.styleSheetId, removeRuleText(css, rule.range));
        }
    });

    const tabURL = new URL(currentTab.url);
    let outputCSS = '';

    // we use stylesheetsMeta to respect order of stylesheets on the page
    for (let stylesheet of stylesheetsMeta) {
        const stylesheetURL = (!stylesheet.isInline && stylesheet.sourceURL) ? new URL(stylesheet.sourceURL) : null;
        let css = cssMap.get(stylesheet.styleSheetId);

        if (css) {
            css = css.join('');

            if (stylesheetURL) {
                css = rebaseURLs(css, url => {
                    if (stylesheetURL.protocol === tabURL.protocol && stylesheetURL.hostname === tabURL.hostname) {
                        return urlResolve('/', url);
                    } else {
                        return urlResolve(stylesheetURL.protocol + '//' + stylesheetURL.hostname, url)
                    }
                });
            }

            outputCSS += css;
        }
    }

    // TODO special characters https://github.com/pocketjoso/penthouse#special-glyphs-not-showingshowing-incorrectly
    // TODO reduce selectors - not everything is needed
    outputCSS = cleanCSS.minify(outputCSS).styles;

    return outputCSS;
}

function getCSSInjectionCode(css) {
    return `
    (function() {
      const style = document.createElement('style');
      style.innerText = atob("${btoa(css)}");
      document.head.appendChild(style);
    })();
  `;
}

async function startRecording(tabId) {
    chrome.browserAction.setBadgeText({text: 'rec'});

    tabDebugger = new TabDebugger(tabId);

    try {
        stylesheetsMeta = [];
        tabDebugger.addListener(collectStylesheets)

        await tabDebugger.connect();
        await tabDebugger.sendCommand('DOM.enable');
        await tabDebugger.sendCommand('CSS.enable');

        tabDebugger.removeListener(collectStylesheets);
        // wait a bit for all styleSheetAdded events to be fired
        await timeout(300);

        await injectCode(currentTab.id, {file: 'injected/hide-below-the-fold.js'});
        //TODO fix the 'RuleUsageTracking is not enabled' bug
        await tabDebugger.sendCommand('CSS.startRuleUsageTracking');

    } catch (error) {
        console.error(error);
        stopRecording();
    }
}

async function stopRecording() {
    chrome.browserAction.setBadgeText({text: ''});

    if (!tabDebugger || !tabDebugger.isConnected()) {
        tabDebugger = null;
        return;
    }

    try {
        const data = await tabDebugger.sendCommand('CSS.stopRuleUsageTracking');
        const outputCSS = await processData(data);

        chrome.tabs.create({
            url: window.URL.createObjectURL(new Blob([outputCSS], {type: 'text/plain'})),
            active: false
        });

        await injectCode(currentTab.id, {file: 'injected/remove-all-styles.js'});
        injectCode(currentTab.id, {code: getCSSInjectionCode(outputCSS)});

        tabDebugger.disconnect();
        tabDebugger = null;
    } catch (error) {
        console.error(error);
    }
}

function handleActionButtonClick(tab) {
    currentTab = tab;

    if (!tabDebugger) {
        startRecording(tab.id);
    } else {
        stopRecording();
    }
}

chrome.browserAction.setBadgeBackgroundColor({color: "#F00"});
chrome.browserAction.onClicked.addListener(handleActionButtonClick);
