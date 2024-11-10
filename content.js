function retrieveTranscript() {
  const videoId = new URLSearchParams(window.location.search).get("v");
  const YT_INITIAL_PLAYER_RESPONSE_RE =
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;

  let player = window.ytInitialPlayerResponse;

  // Check if we already have the player object; if not, fetch it
  if (!player || videoId !== player.videoDetails.videoId) {
    fetch(`https://www.youtube.com/watch?v=${videoId}`)
        .then(response => response.text())
        .then(body => {
          // Try to extract ytInitialPlayerResponse JSON from page content
          const playerResponse = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
          if (!playerResponse) {
            console.warn("Unable to parse playerResponse");
            document.getElementById("transcript-content").innerText = "Transcript not available.";
            return;
          }

          // Parse the player response and get metadata and captions
          player = JSON.parse(playerResponse[1]);
          const metadata = {
            title: player.videoDetails.title,
            duration: player.videoDetails.lengthSeconds,
            author: player.videoDetails.author,
            views: player.videoDetails.viewCount,
          };

          // Get the available caption tracks
          const tracks = player.captions.playerCaptionsTracklistRenderer.captionTracks;
          if (!tracks || tracks.length === 0) {
            console.log("No captions available for this video.");
            document.getElementById("transcript-content").innerText = "Transcript not available.";
            return;
          }

          // Sort tracks so that preferred language captions come first
          tracks.sort(compareTracks);

          // Fetch the transcript using the top-priority caption track
          fetch(transcriptUrl = tracks[0].baseUrl + "&fmt=json3")
              .then(response => response.json())
              .then(transcript => {
                // Process the transcript data
                const parsedTranscript = transcript.events
                    .filter(event => event.segs) // Filter out invalid segments
                    .map(event => event.segs.map(seg => seg.utf8).join(" ")) // Concatenate text in each segment
                    .join(" ") // Join all text segments together
                    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove unwanted characters
                    .replace(/\s+/g, ' '); // Replace any whitespace with a single space

                // Display the transcript in the extension's tab
                document.getElementById("transcript-content").innerText = parsedTranscript;
                console.log("EXTRACTED_TRANSCRIPT", parsedTranscript);
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
    return -1; // English comes first
  } else if (langCode1 !== 'en' && langCode2 === 'en') {
    return 1; // English comes first
  } else if (track1.kind !== 'asr' && track2.kind === 'asr') {
    return -1; // Non-ASR comes first
  } else if (track1.kind === 'asr' && track2.kind !== 'asr') {
    return 1; // Non-ASR comes first
  }

  return 0; // Preserve order if both have the same priority
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
  transcriptTab.innerHTML = '<h3>Transcript</h3><div id="transcript-content">Loading...</div>';

  sidebar.prepend(transcriptTab);
  console.log("Transcript tab created.");

  retrieveTranscript(); // Start fetching the transcript
}
chrome.storage.sync.get(["aiSummarizerEnabled", "summarizerLevel"], (data) => {
  if (data.aiSummarizerEnabled) {
    // Code for AI summarizer functionality here, based on summarizerLevel
  }
});
