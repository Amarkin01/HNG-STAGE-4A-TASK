chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarize") {
        fetchSummary(request.text)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        return true; // Keep the messaging channel open for the async response
    }
});

async function fetchSummary(text) {
    // Correct URL points directly to the Next.js API route!
    const response = await fetch('https://amarkin-stage-4a.vercel.app/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });

    const data = await response.json();
    
    if (!response.ok || !data.summary) {
        throw new Error(data.error || "Failed to get summary from server");
    }

    return data;
}
