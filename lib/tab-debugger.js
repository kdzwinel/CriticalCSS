function _attach(tabId) {
    const protocolVersion = '1.1';

    return new Promise((resolve, reject) => {
        chrome.debugger.attach({
            tabId: tabId
        }, protocolVersion, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
                return;
            }

            resolve();
        });
    });
}

function _detach(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.detach({
            tabId: tabId
        }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
                return;
            }

            resolve();
        });
    });
}


function _sendCommand(tabId, command, data = {}) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({
            tabId: tabId
        }, command, data, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
                return;
            }

            resolve(response);
        });
    });
}

class TabDebugger {
    constructor(tabId) {
        this._tabId = tabId;

        chrome.debugger.onDetach.addListener((source, reason) => {
            if (source.tabId === this._tabId) {
                this._attached = false;
            }
        });
    }

    isConnected() {
        return this._attached;
    }

    connect() {
        return _attach(this._tabId).then(() => this._attached = true);
    }

    disconnect() {
        return _detach(this._tabId);
    }

    sendCommand(command, data) {
        if (!this._attached) {
            throw new Error('Debugger is not attached yet.');
        }

        return _sendCommand(this._tabId, command, data);
    }
}
