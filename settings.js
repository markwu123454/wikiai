document.addEventListener("DOMContentLoaded", () => {
    loadSettings();

    // Save settings when the Save button is clicked
    document.getElementById("save-settings").addEventListener("click", saveSettings);
});

function loadSettings() {
    chrome.storage.sync.get(
        ["aiSummarizerEnabled", "summarizerLevel", "transcriptFontSize"],
        (data) => {
            document.getElementById("ai-summarizer").checked = data.aiSummarizerEnabled || false;
            document.getElementById("summarizer-level").value = data.summarizerLevel || "brief";
            document.getElementById("transcript-font-size").value = data.transcriptFontSize || "medium";
        }
    );
}

function saveSettings() {
    const aiSummarizerEnabled = document.getElementById("ai-summarizer").checked;
    const summarizerLevel = document.getElementById("summarizer-level").value;
    const transcriptFontSize = document.getElementById("transcript-font-size").value;

    chrome.storage.sync.set(
        {
            aiSummarizerEnabled: aiSummarizerEnabled,
            summarizerLevel: summarizerLevel,
            transcriptFontSize: transcriptFontSize
        },
        () => {
            // Show a confirmation message
            const status = document.getElementById("status");
            status.style.display = "block";
            setTimeout(() => {
                status.style.display = "none";
            }, 1000);
        }
    );
}
