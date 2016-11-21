async function injectCode(tabId, data) {
    return new Promise((resolve, reject) => {

        chrome.tabs.executeScript(tabId, data, result => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
                return;
            }

            resolve(result);
        });

    })
}
