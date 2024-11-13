// Initialize video ID
let currentVideoId = new URLSearchParams(window.location.search).get("v");
let transcriptText = ''; // Store the transcript text globally

// Function to check for video changes
function checkVideoChange() {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId !== currentVideoId) {
        currentVideoId = videoId; // Update the current videoId
        retrieveTranscript(); // Reload the transcript for the new video
    }
}

setInterval(checkVideoChange, 3000)

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
                    document.getElementById("transcript-content").innerText = "No transcript found for current video.";
                    return;
                }

                player = JSON.parse(playerResponse[1]);
                const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
                if (!tracks || tracks.length === 0) {
                    console.log("No captions available for this video.");
                    document.getElementById("transcript-content").innerText = "No transcript found for current video.";
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

                        transcriptText = parsedTranscript; // Store the transcript in the global variable

                        // Call function to show the transcript and enable the generate summary button
                        document.getElementById("transcript-content").innerText = "Transcript found";
                        document.getElementById("generate-summary-btn").style.backgroundColor = "#0073e6";
                        document.getElementById("generate-summary-btn").disabled = false; // Enable button
                    })
                    .catch(error => {
                        console.error("Error fetching transcript:", error);
                        document.getElementById("transcript-content").innerText = "No transcript found for current video.";
                    });
            })
            .catch(error => {
                console.error("Error fetching page content:", error);
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
    console.log("Generating summary...");

    // Change the text while generating the summary
    document.getElementById("transcript-content").innerText = "Generating summary...";

    summarizeTranscript(transcriptText); // Call the function to summarize the transcript
}

// Function to summarize the transcript using Gemini API
function summarizeTranscript(transcript) {
    chrome.storage.sync.get(["geminiApiKey", "promptGroups", "selectedPromptIndex"], (data) => {
        const apiKey = atob(data.geminiApiKey);  // Decode the API key from base64
        const promptGroups = data.promptGroups || [];
        const selectedIndex = data.selectedPromptIndex;

        // Get the selected prompt
        const selectedPrompt = promptGroups[selectedIndex];

        if (!selectedPrompt) {
            console.error("No prompt selected.");
            document.getElementById("transcript-content").innerText = "Error while generating summary";
            return;
        }

        const model = selectedPrompt.model;
        const promptTemplate = selectedPrompt.content;

        if (!model || !promptTemplate) {
            console.error("Invalid model or prompt content.");
            document.getElementById("transcript-content").innerText = "Error while generating summary";
            return;
        }

        // Replace {transcript} in the prompt content with the actual transcript
        let prompt = promptTemplate;

        if (prompt.includes("{transcript}")) {
            // Replace {transcript} with the actual transcript
            prompt = promptTemplate.replace("{transcript}", transcript);
        } else {
            // If {transcript} is not found, append the transcript at the end
            prompt = promptTemplate + "\n\n" + transcript;
        }

        // API call to generate summary
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
                console.log("API Response:", data);

                // Check if the response contains candidates
                if (data.candidates && data.candidates.length > 0) {
                    const generatedText = data.candidates[0].content.parts[0].text;

                    // Display the generated summary text
                    document.getElementById("transcript-content").innerText = `${generatedText}`;
                    document.getElementById("generate-summary-btn").innerText = "Regenerate summary"; // Update button text
                } else {
                    console.error("No candidates in API response.");
                    document.getElementById("transcript-content").innerText = "Error while generating summary";
                }
            })
            .catch(error => {
                console.error("Error with AI summarization:", error);
                document.getElementById("transcript-content").innerText = "Error while generating summary";
            });
    });
}
