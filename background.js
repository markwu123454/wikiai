import axios from 'axios';  // Import axios for handling HTTP requests to the Gemini API

console.log("background service worker started")

// Define the main function that interacts with the Gemini API to generate a summary
async function summarizeTranscript(transcript, apiKey, promptGroups, selectedIndex) {
    console.log("received data")
    // Retrieve the user-selected prompt based on index; check for a valid prompt and API key
    const selectedPrompt = promptGroups[selectedIndex];
    if (!selectedPrompt || !apiKey) {
        throw new Error("Missing valid prompt or API key");
    }

    // Extract the selected AI model and prompt template
    const model = selectedPrompt.model;
    const promptTemplate = selectedPrompt.content;

    // Build the prompt by replacing "{transcript}" placeholder with the actual transcript text if present
    let prompt = promptTemplate.includes("{transcript}")
        ? promptTemplate.replace("{transcript}", transcript)
        : promptTemplate + "\n\n" + transcript;  // If no placeholder, append the transcript text

    try {
        // Send a POST request to the Gemini API endpoint using the chosen model and API key
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] },  // Structure data as per API requirements
            { headers: { 'Content-Type': 'application/json' } }  // Set JSON headers
        );

        // Check for valid response data and retrieve the summary text if available
        if (response.data.candidates && response.data.candidates.length > 0) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("No valid response from the API.");
        }
    } catch (error) {
        console.error("Error with AI summarization:", error);
        throw new Error("Error generating summary");  // Catch and rethrow errors for handling upstream
    }
}

// Listen for incoming connections from frontend scripts
chrome.runtime.onConnect.addListener((port) => {
    console.log("Connected to port:", port.name);  // Log the connection for debugging

    // Add a listener for messages sent through this port
    port.onMessage.addListener((message) => {
        // Check if the action type is to summarize the transcript
        if (message.action === "summarizeTranscript") {
            const { transcript, geminiApiKey, promptGroups, selectedPromptIndex } = message.requestData;

            // Call summarizeTranscript and handle responses (summary or error)
            summarizeTranscript(transcript, geminiApiKey, promptGroups, selectedPromptIndex)
                .then(summary => {
                    port.postMessage({ summary });  // Send the summary back to the frontend
                })
                .catch(error => {
                    port.postMessage({ error: error.message || "Error generating summary" });  // Send any error messages back to the frontend
                });
        }
    });

    // Log disconnection events
    port.onDisconnect.addListener(() => {
        console.log("Disconnected from port:", port.name);
    });
});

// Set up a listener for extension action clicks, opening settings when clicked
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({url: chrome.runtime.getURL("settings.html")});  // Opens settings page in a new tab
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Background service worker started on installation.");
});
setInterval(() => console.log("Service worker is active"), 5000);
