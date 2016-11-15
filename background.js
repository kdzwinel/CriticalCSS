const cleanCSS = new CleanCSS({
  keepSpecialComments: 0
});
let tabDebugger = null;

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

        if(css) {
          cssMap.set(rule.styleSheetId, removeRuleText(css, rule.range));
        }
    });

    let outputCSS = '';
    for(const css of cssMap.values()) {
      outputCSS += css.join('\n');
    }

    // TODO fix relative urls - root param of cleanCSS
    // TODO special characters https://github.com/pocketjoso/penthouse#special-glyphs-not-showingshowing-incorrectly
    // TODO reduce selectors - not everything is needed
    // TODO maintain order of stylesheets
    outputCSS = cleanCSS.minify(outputCSS).styles;

    return outputCSS;
}

function getCSSInjectionCode(css) {
  return `
    (function() {
      let link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'data:text/css;base64,${btoa(css)}';
      document.head.appendChild(link);
    })();
  `
}

async function startRecording(tabId) {
    chrome.browserAction.setBadgeText({text: 'rec'});

    tabDebugger = new TabDebugger(tabId);

    try {
        await tabDebugger.connect();
        await injectCode({file: 'injected/hide-below-the-fold.js'});
        await tabDebugger.sendCommand('DOM.enable');
        await tabDebugger.sendCommand('CSS.enable');
        await tabDebugger.sendCommand('CSS.startRuleUsageTracking');

        tabDebugger.sendCommand('CSS.startRuleUsageTracking')

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

      await injectCode({file: 'injected/remove-all-styles.js'});
      injectCode({code: getCSSInjectionCode(outputCSS)});

      tabDebugger.disconnect();
      tabDebugger = null;
    } catch (error) {
      console.error(error);
    }
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
