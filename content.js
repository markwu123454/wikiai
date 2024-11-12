// Initialize video ID
let currentVideoId = new URLSearchParams(window.location.search).get("v");

// Function to check for video changes
function checkVideoChange() {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId !== currentVideoId) {
        currentVideoId = videoId; // Update the current videoId
        retrieveTranscript(); // Reload the transcript for the new video
    }
}

// Add a MutationObserver to initialize the transcript tab after page load
const observer = new MutationObserver((mutations, obs) => {
    if (document.getElementById("secondary")) {
        console.log("Sidebar detected. Initializing transcript tab...");
        createTranscriptTab();
        obs.disconnect(); // Stop observing once the tab is created
    }
});

observer.observe(document, { childList: true, subtree: true });

// Function to create and display the transcript tab
function createTranscriptTab() {
    console.log("Attempting to create transcript tab...");

    const sidebar = document.getElementById("secondary");
    if (!sidebar) {
        console.log("Sidebar not found.");
        return;
    }

    if (document.getElementById("transcript-tab")) {
        console.log("Transcript tab already exists.");
        return;
    }

    const transcriptTab = document.createElement("div");
    transcriptTab.id = "transcript-tab";
    transcriptTab.innerHTML = `
        <h3 id="transcript-title">Transcript</h3>
        <div id="transcript-content">Loading...</div>
        <button id="reload-transcript-btn">Reload Transcript</button>
    `;

    sidebar.prepend(transcriptTab);
    console.log("Transcript tab created.");

    // Attach event listener to the reload button
    document.getElementById("reload-transcript-btn").addEventListener("click", () => {
        console.log("Reloading transcript...");
        retrieveTranscript();
    });

    retrieveTranscript(); // Start fetching the transcript

    // Start checking for video changes
    setInterval(checkVideoChange, 1000); // Check every 1 second
}

// Function to retrieve the transcript and then summarize it
function retrieveTranscript() {
    const videoId = new URLSearchParams(window.location.search).get("v");
    const YT_INITIAL_PLAYER_RESPONSE_RE = /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;

    let player = window.ytInitialPlayerResponse;

    if (!player || videoId !== player.videoDetails.videoId) {
        fetch(`https://www.youtube.com/watch?v=${videoId}`)
            .then(response => response.text())
            .then(body => {
                const playerResponse = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
                if (!playerResponse) {
                    console.warn("Unable to parse playerResponse");
                    document.getElementById("transcript-content").innerText = "Transcript not available.";
                    return;
                }

                player = JSON.parse(playerResponse[1]);
                const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
                if (!tracks || tracks.length === 0) {
                    console.log("No captions available for this video.");
                    document.getElementById("transcript-content").innerText = "Transcript not available.";
                    return;
                }

                tracks.sort(compareTracks);

                fetch(transcriptUrl = tracks[0].baseUrl + "&fmt=json3")
                    .then(response => response.json())
                    .then(transcript => {
                        const parsedTranscript = transcript.events
                            .filter(event => event.segs)
                            .map(event => event.segs.map(seg => seg.utf8).join(" "))
                            .join(" ")
                            .replace(/[\u200B-\u200D\uFEFF]/g, '')
                            .replace(/\s+/g, ' ');

                        // Call function to summarize the transcript
                        summarizeTranscript(parsedTranscript);
                    })
                    .catch(error => {
                        console.error("Error fetching transcript:", error);
                        document.getElementById("transcript-content").innerText = "Transcript not available.";
                    });
            })
            .catch(error => {
                console.error("Error fetching page content:", error);
                document.getElementById("transcript-content").innerText = "Transcript not available.";
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

// Function to summarize the transcript using Gemini API
function summarizeTranscript(transcript) {
    chrome.storage.sync.get(["geminiApiKey", "promptGroups", "selectedPromptIndex"], (data) => {
        const apiKey = atob(data.geminiApiKey);  // Decode the API key from base64
        const promptGroups = data.promptGroups || [];
        const selectedIndex = data.selectedPromptIndex;

        // Get the selected prompt (assuming selectedPromptIndex is the index of the prompt)
        const selectedPrompt = promptGroups[selectedIndex];

        if (!selectedPrompt) {
            console.error("No prompt selected.");
            document.getElementById("transcript-content").innerText = "Error: No prompt selected.";
            return;
        }

        const model = selectedPrompt.model;
        const promptTemplate = selectedPrompt.content;

        if (!model || !promptTemplate) {
            console.error("Invalid model or prompt content.");
            document.getElementById("transcript-content").innerText = "Error: Invalid model or prompt content.";
            return;
        }

        // Replace {transcript} in the prompt content with the actual transcript
        const prompt = promptTemplate.replace("{transcript}", transcript);

        // Combine the model and the prompt content (just mash the two strings together)
        const combinedContent = `Model: ${model}\n\nPrompt Content: ${prompt}`;

        // Display the combined content as the "transcript" before the API call
        document.getElementById("transcript-content").innerText = combinedContent;

        // Now make the API call with the prompt content
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestData = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        };

        fetch(url, options)
            .then(response => response.json())
            .then(data => {
                console.log("API Response:", data);  // Log the full API response for debugging

                // Check if the response contains candidates and that it's an array
                if (data.candidates && data.candidates.length > 0) {
                    // Extract the generated text from the API response
                    const generatedText = data.candidates[0].content.parts[0].text;  // Access the text field correctly

                    // Display the generated summary text in the transcript section
                    document.getElementById("transcript-content").innerText = `Summarized Text:\n\n${generatedText}`;
                    console.log("Summarized text:", generatedText);
                } else {
                    console.error("No candidates in API response.");
                    document.getElementById("transcript-content").innerText = "Error: No summary generated.";
                }
            })
            .catch(error => {
                console.error("Error with AI summarization:", error);
                document.getElementById("transcript-content").innerText = "Error: Unable to generate summary.";
            });
    });
}
