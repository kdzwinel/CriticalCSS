async function injectCode(data) {
    return new Promise((resolve, reject) => {

        chrome.tabs.executeScript(data, result => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
                return;
            }

            resolve(result);
        });

    })
}
