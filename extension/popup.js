const summarizeBtn = document.getElementById('summarizeBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const status = document.getElementById('status');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');
const resultArea = document.getElementById('resultArea');
const summaryList = document.getElementById('summaryList');
const insightsList = document.getElementById('insightsList');
const readingTimeText = document.getElementById('readingTime');

function updateStatus(msg, showLoader = false) {
    status.innerText = msg;
    loader.style.display = showLoader ? 'block' : 'none';
}

function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
}

function extractContent() {
    // Try to find the main content
    const article = document.querySelector('article') || 
                    document.querySelector('main') || 
                    document.querySelector('.content') || 
                    document.querySelector('.post-content');
    
    if (article) {
        return article.innerText;
    }
    
    // Fallback to body but try to remove common noise
    const body = document.body.cloneNode(true);
    ['header', 'footer', 'nav', 'aside', 'script', 'style'].forEach(tag => {
        body.querySelectorAll(tag).forEach(el => el.remove());
    });
    return body.innerText;
}

summarizeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;

    chrome.storage.local.get([url], async (result) => {
        if (result[url]) {
            displaySummary(result[url]);
            updateStatus("Loaded from cache.");
            return;
        }

        summarizeBtn.disabled = true;
        updateStatus("Reading page content...", true);

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractContent,
        }, async (results) => {
            if (!results || !results[0]) {
                updateStatus("Failed to read page.");
                summarizeBtn.disabled = false;
                return;
            }

            const pageText = results[0].result;
            const readingTime = calculateReadingTime(pageText);
            updateStatus("Analyzing with AI...", true);

            chrome.runtime.sendMessage(
                { action: "summarize", text: pageText.substring(0, 6000) },
                (response) => {
                    summarizeBtn.disabled = false;
                    
                    if (response && response.success) {
                        const data = response.data;
                        // Add reading time if not provided by AI
                        if (!data.estimatedReadingTime) data.estimatedReadingTime = readingTime;
                        
                        chrome.storage.local.set({ [url]: data });
                        displaySummary(data);
                        updateStatus("Done!");
                    } else {
                        updateStatus("Error!");
                        alert(response ? response.error : "Failed to communicate with background.");
                    }
                }
            );
        });
    });
});

function displaySummary(data) {
    emptyState.style.display = 'none';
    resultArea.style.display = 'block';
    
    // Clear previous
    summaryList.innerHTML = '';
    insightsList.innerHTML = '';

    // Summary bullets
    if (Array.isArray(data.summary)) {
        data.summary.forEach(point => {
            const li = document.createElement('li');
            li.innerText = point;
            summaryList.appendChild(li);
        });
    }

    // Insights
    if (Array.isArray(data.keyInsights)) {
        data.keyInsights.forEach(insight => {
            const span = document.createElement('span');
            span.className = 'insight-tag';
            span.innerText = insight;
            insightsList.appendChild(span);
        });
    }

    readingTimeText.innerText = data.estimatedReadingTime || "";
}

clearBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.storage.local.remove([tab.url], () => {
        emptyState.style.display = 'block';
        resultArea.style.display = 'none';
        updateStatus("Cache cleared.");
    });
});

copyBtn.addEventListener('click', () => {
    const text = Array.from(summaryList.querySelectorAll('li')).map(li => "• " + li.innerText).join('\n');
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        setTimeout(() => copyBtn.innerText = originalText, 2000);
    });
});