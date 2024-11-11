// Wait for the DOM to load fully
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();

    // Event listeners for buttons and menu items
    document.getElementById("save-settings").addEventListener("click", saveSettings);
    document.getElementById("new-prompt").addEventListener("click", createNewPrompt);
    document.getElementById("save-prompt").addEventListener("click", savePrompt);
    document.getElementById("delete-prompt").addEventListener("click", deletePrompt);
    document.getElementById("menu-api-key").addEventListener("click", () => showSection("api-key"));
    document.getElementById("menu-model-prompt").addEventListener("click", () => showSection("model-prompt"));

    // Event listener for prompt dropdown
    document.getElementById("prompts-select").addEventListener("change", handlePromptSelection);
});

// Load settings on startup
function loadSettings() {
    chrome.storage.sync.get(["geminiApiKey", "promptGroups", "selectedPromptIndex"], (data) => {
        if (data.geminiApiKey) {
            document.getElementById("api-key-input").value = atob(data.geminiApiKey); // Decode API key
        }
        if (data.promptGroups) {
            populatePromptOptions(data.promptGroups, data.selectedPromptIndex);
        } else {
            const examplePrompt = {
                name: "Example prompt",
                model: "Gemini 1.5 Flash",
                content: "Summarize the following transcript from a YouTube video. Condense the main ideas and key points while keeping the summary informative and easy to understand. Focus on the most important aspects and remove any irrelevant details. Here is the transcript:{transcript}"
            };
            // Save example prompt if none exists
            chrome.storage.sync.set({ promptGroups: [examplePrompt], selectedPromptIndex: 0 }, () => {
                populatePromptOptions([examplePrompt], 0);
                // Pre-fill the inputs with the example prompt values
                document.getElementById("prompt-title").value = examplePrompt.name;
                document.getElementById("model-select").value = examplePrompt.model;
                document.getElementById("prompt-content").value = examplePrompt.content;
            });
        }
    });
}

function populatePromptOptions(promptGroups, selectedIndex) {
    const promptSelect = document.getElementById("prompts-select");
    promptSelect.innerHTML = '';  // Clear existing options

    // Add each prompt group to the dropdown
    promptGroups.forEach((group, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = group.name || `Prompt ${index + 1}`;
        promptSelect.appendChild(option);
    });

    // Automatically select the previously selected prompt
    if (promptGroups.length > 0) {
        promptSelect.value = selectedIndex;
        handlePromptSelection();  // Pre-fill the fields based on the selected prompt
    }
}

function handlePromptSelection() {
    const selectedIndex = document.getElementById("prompts-select").value;

    chrome.storage.sync.get("promptGroups", (data) => {
        const group = data.promptGroups[selectedIndex];
        if (group) {
            document.getElementById("prompt-title").value = group.name;
            document.getElementById("model-select").value = group.model;
            document.getElementById("prompt-content").value = group.content;
        }

        // Save the currently selected prompt index to storage
        chrome.storage.sync.set({ selectedPromptIndex: selectedIndex });
    });
}

function createNewPrompt() {
    // Clear all fields
    document.getElementById("prompt-title").value = "";
    document.getElementById("model-select").value = "";
    document.getElementById("prompt-content").value = "";
}

function savePrompt() {
    const title = document.getElementById("prompt-title").value;
    const model = document.getElementById("model-select").value;
    const content = document.getElementById("prompt-content").value;

    if (!title || !model || !content) {
        alert("Please fill in all fields.");  // Basic validation
        return;
    }

    chrome.storage.sync.get("promptGroups", (data) => {
        let promptGroups = data.promptGroups || [];
        const existingIndex = promptGroups.findIndex((group) => group.name === title);

        if (existingIndex >= 0) {
            promptGroups[existingIndex] = { name: title, model, content };  // Override if exists
        } else {
            promptGroups.push({ name: title, model, content });  // Add as new if not found
        }

        chrome.storage.sync.set({ promptGroups }, () => {
            populatePromptOptions(promptGroups, promptGroups.length - 1);  // Refresh dropdown and select the new prompt
            handlePromptSelection();  // Pre-fill the fields with the new prompt's data
            document.getElementById("save-prompt-status").style.display = "block";
            setTimeout(() => {
                document.getElementById("save-prompt-status").style.display = "none";
            }, 1000);
        });
    });
}

function deletePrompt() {
    const title = document.getElementById("prompt-title").value;

    chrome.storage.sync.get("promptGroups", (data) => {
        let promptGroups = data.promptGroups || [];
        promptGroups = promptGroups.filter((group) => group.name !== title);  // Remove by name

        chrome.storage.sync.set({ promptGroups }, () => {
            populatePromptOptions(promptGroups, 0);  // Refresh the dropdown and select the first prompt
            createNewPrompt();  // Clear fields after deletion
            document.getElementById("delete-prompt-status").style.display = "block";
            setTimeout(() => {
                document.getElementById("delete-prompt-status").style.display = "none";
            }, 1000);
        });
    });
}

function saveSettings() {
    const apiKey = document.getElementById("api-key-input").value;
    const encryptedApiKey = btoa(apiKey);  // Encode API key

    chrome.storage.sync.set({ geminiApiKey: encryptedApiKey }, () => {
        document.getElementById("status").style.display = "block";
        setTimeout(() => {
            document.getElementById("status").style.display = "none";
        }, 1000);
    });
}

function showSection(section) {
    document.querySelectorAll("#settings-content > div").forEach((el) => el.style.display = "none");
    document.getElementById(section).style.display = "block";
}
