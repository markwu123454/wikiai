// Wait for the DOM content to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Get the checkbox element by its ID ('toggleSwitch')
    const toggleSwitch = document.getElementById('toggleSwitch');

    // Load the current toggle state from Chrome's storage
    chrome.storage.sync.get(['isEnabled'], (result) => {
        // Set the checkbox state based on the stored value. If it's not set, default to 'true' (enabled)
        toggleSwitch.checked = result.isEnabled ?? true;  // Use '??' to provide a default value if isEnabled is undefined
    });

    // Listen for changes to the checkbox (when the user toggles it)
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;  // Get the current state of the checkbox (checked or unchecked)

        // Save the new state of the toggle (enabled or disabled) to Chrome's storage
        chrome.storage.sync.set({ isEnabled });

        // Query the active tab in the current window and send a message to content.js
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Send a message to the content script with the updated 'isEnabled' value
            chrome.tabs.sendMessage(tabs[0].id, { isEnabled });

            // Reload the active tab to apply changes (optional, depending on desired behavior)
            chrome.tabs.reload();
        });
    });
});
