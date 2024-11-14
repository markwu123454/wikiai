// Initialize video ID
let currentVideoId = new URLSearchParams(window.location.search).get("v");
let transcriptText = ''; // Store the transcript text globally

// Function to check for video changes and initialize tab if a video is playing
function checkVideoChange() {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId !== currentVideoId) {
        currentVideoId = videoId; // Update the current videoId
        if (currentVideoId) {
            createTranscriptTab(); // Only create tab if a video is playing
            retrieveTranscript(); // Reload the transcript for the new video
        } else {
            removeTranscriptTab(); // Remove the tab if no video is playing
        }
    }
}

setInterval(checkVideoChange, 3000);

// Add a MutationObserver to initialize the transcript tab after page load if a video is playing
const observer = new MutationObserver((mutations, obs) => {
    if (document.getElementById("secondary") && currentVideoId) {
        console.log("Sidebar and video detected. Initializing transcript tab...");
        createTranscriptTab();
        obs.disconnect(); // Stop observing once the tab is created
    }
});

observer.observe(document, {childList: true, subtree: true});

// Function to create and display the transcript tab
function createTranscriptTab() {
    console.log("Attempting to create transcript tab...");

    const sidebar = document.getElementById("secondary");
    if (!sidebar || document.getElementById("transcript-tab")) {
        return; // Exit if sidebar not found or tab already exists
    }

    const transcriptTab = document.createElement("div");
    transcriptTab.id = "transcript-tab";
    transcriptTab.innerHTML = `
        <h3 id="transcript-title">AI Summary</h3>
        <div id="transcript-content">Getting transcript...</div>
        <button id="generate-summary-btn" style="background-color: #e0e0e0;" disabled>Generate summary</button>
    `;

    sidebar.prepend(transcriptTab);
    console.log("Transcript tab created.");

    // Attach event listener to the generate summary button
    document.getElementById("generate-summary-btn").addEventListener("click", () => {
        generateSummary();
    });

    retrieveTranscript(); // Start fetching the transcript
}

// Function to remove the transcript tab if no video is playing
function removeTranscriptTab() {
    const transcriptTab = document.getElementById("transcript-tab");
    if (transcriptTab) {
        transcriptTab.remove();
        console.log("Transcript tab removed as no video is playing.");
    }
}

// Function to retrieve the transcript and then summarize it
function retrieveTranscript(retryCount = 0) {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (!videoId) {
        return;
    }

    const YT_INITIAL_PLAYER_RESPONSE_RE = /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;

    let player = window.ytInitialPlayerResponse;

    if (!player || videoId !== player.videoDetails.videoId) {
        fetch(`https://www.youtube.com/watch?v=${videoId}`)
            .then(response => response.text())
            .then(body => {
                const playerResponse = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
                if (!playerResponse) {
                    document.getElementById("transcript-content").innerText = "No transcript found for current video.";
                    return;
                }

                player = JSON.parse(playerResponse[1]);

                // Retry logic for playerCaptionsTracklistRenderer loading
                if (!player.captions || !player.captions.playerCaptionsTracklistRenderer) {
                    if (retryCount < 5) {  // Retry up to 5 times
                        console.warn("Captions not loaded. Retrying...");
                        setTimeout(() => retrieveTranscript(retryCount + 1), 1000);
                    } else {
                        document.getElementById("transcript-content").innerText = "No transcript found for current video.";
                    }
                    return;
                }

                const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
                if (!tracks || tracks.length === 0) {
                    document.getElementById("transcript-content").innerText = "No transcript found for current video.";
                    return;
                }

                tracks.sort(compareTracks);

                fetch(tracks[0].baseUrl + "&fmt=json3")
                    .then(response => response.json())
                    .then(transcript => {
                        const parsedTranscript = transcript.events
                            .filter(event => event.segs)
                            .map(event => event.segs.map(seg => seg.utf8).join(" "))
                            .join(" ")
                            .replace(/[\u200B-\u200D\uFEFF]/g, '')
                            .replace(/\s+/g, ' ');

                        transcriptText = parsedTranscript; // Store the transcript in the global variable

                        // Display transcript and enable the generate summary button
                        document.getElementById("transcript-content").innerText = "Transcript found";
                        document.getElementById("generate-summary-btn").style.backgroundColor = "#0073e6";
                        document.getElementById("generate-summary-btn").disabled = false;
                    })
                    .catch(error => {
                        document.getElementById("transcript-content").innerText = "No transcript found for current video.";
                    });
            })
            .catch(error => {
                document.getElementById("transcript-content").innerText = "No transcript found for current video.";
            });
    }
}


// Function to compare and prioritize tracks (English and non-ASR preferred)
function compareTracks(track1, track2) {
    const langCode1 = track1.languageCode;
    const langCode2 = track2.languageCode;

    if (langCode1 === 'en' && langCode2 !== 'en') {
        return -1;
    } else if (langCode1 !== 'en' && langCode2 === 'en') {
        return 1;
    } else if (track1.kind !== 'asr' && track2.kind === 'asr') {
        return -1;
    } else if (track1.kind === 'asr' && track2.kind !== 'asr') {
        return 1;
    }

    return 0;
}

// Function to generate a summary
function generateSummary() {

    // Change the text while generating the summary
    document.getElementById("transcript-content").innerText = "Generating summary...";

    summarizeTranscript(transcriptText); // Call the function to summarize the transcript
}
function summarizeTranscript(transcript) {
    // Retrieve essential data from Chrome's synchronized storage (API key, prompts, and selected index)
    chrome.storage.sync.get(["geminiApiKey", "promptGroups", "selectedPromptIndex"], (data) => {
        // Decode the stored API key (assumes it's Base64 encoded for privacy reasons)
        const apiKey = atob(data.geminiApiKey);
        const promptGroups = data.promptGroups || [];  // Get stored prompt groups, or use an empty array if undefined
        const selectedIndex = data.selectedPromptIndex;

        // Check if API key exists; if not, show an error
        if (!apiKey) {
            displayError("No API key stored");
            return;
        }

        // Check if a valid prompt is selected; if not, show an error
        if (!promptGroups[selectedIndex]) {
            displayError("No valid prompt selected");
            return;
        }

        // Retrieve selected prompt details
        const selectedPrompt = promptGroups[selectedIndex];
        const model = selectedPrompt.model;             // The AI model selected by the user
        const promptTemplate = selectedPrompt.content;  // The text template for AI prompt

        // Validate model and prompt template; show error if missing
        if (!model || !promptTemplate) {
            displayError("No valid model or prompt found");
            return;
        }

        // Prepare data to send to the background service worker
        const requestData = {
            transcript: transcript,                  // Video transcript text to summarize
            geminiApiKey: apiKey,                    // Decoded API key
            promptGroups: promptGroups,              // All prompt groups (includes selected prompt)
            selectedPromptIndex: selectedIndex       // Index of the prompt selected
        };

        // Establish a connection to the background service worker
        const port = chrome.runtime.connect({ name: "summarizeTranscript" });

        // Send a message to the background worker to process the transcript
        port.postMessage({ action: "summarizeTranscript", requestData });

        // Listener to handle responses from the background worker
        port.onMessage.addListener((response) => {
            if (response.summary) {
                // If summary is received, display it in the transcript content area
                document.getElementById("transcript-content").innerText = response.summary;
                // Update button text to indicate summary regeneration option
                document.getElementById("generate-summary-btn").innerText = "Regenerate summary";
            } else if (response.error) {
                // Display error message if received from background worker
                displayError(response.error);
            } else {
                // Handle unknown errors
                displayError("Unknown error occurred during summary generation.");
            }
        });

        // Handle the case when the connection to the background worker is disconnected
        port.onDisconnect.addListener(() => {
            console.log("Background service worker disconnected.");
        });
    });
}

// Utility function to display error messages on the UI
function displayError(message) {
    document.getElementById("transcript-content").innerText = message;    // Show error in transcript area
    document.getElementById("generate-summary-btn").innerText = "Error generating summary"; // Update button text
}