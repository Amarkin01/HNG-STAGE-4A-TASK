const summarizeBtn = document.getElementById('summarizeBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');
const summaryDiv = document.getElementById('summary');

summarizeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    // 1. Check if summary is already cached
    chrome.storage.local.get([url], async (result) => {
        if (result[url]) {
            summaryDiv.innerText = result[url];
            status.innerText = "Loaded from cache.";
            return;
        }

        // 2. If not cached, start summarization
        summarizeBtn.disabled = true;
        status.innerHTML = '<span class="loading">Reading page content...</span>';

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText,
        }, async (results) => {
            const pageText = results[0].result;
            status.innerHTML = '<span class="loading">Generating AI Summary...</span>';

            // 3. Delegate the API call to the Background Service Worker
            chrome.runtime.sendMessage(
                { action: "summarize", text: pageText.substring(0, 3000) },
                (response) => {
                    summarizeBtn.disabled = false;
                    
                    if (response && response.success) {
                        summaryDiv.innerText = response.data.summary;
                        chrome.storage.local.set({ [url]: response.data.summary });
                        status.innerText = "Done!";
                    } else {
                        status.innerText = "Error!";
                        summaryDiv.innerText = response ? response.error : "Failed to communicate with background script.";
                    }
                }
            );
        });
    });
});

clearBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    
    // Remove from cache
    chrome.storage.local.remove([url], () => {
        summaryDiv.innerText = "Your summary will appear here...";
        status.innerText = "Summary cleared.";
    });
});