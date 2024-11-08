// Function to insert a custom empty tab above the suggested videos list on YouTube
function insertEmptyTabAboveSuggestedVideos() {
  // Create a new <div> element for the custom empty tab
  const emptyTab = document.createElement("div");
  emptyTab.classList.add("custom-empty-tab");  // Add a custom class to the div for styling
  emptyTab.textContent = "custom-empty-tab";  // Set the text content of the tab

  // MutationObserver callback function to observe changes in the DOM
  const observerCallback = function(mutationsList, observer) {
    // Loop through all mutations that happen in the target element
    for (const mutation of mutationsList) {
      // Select the related videos container by class name
      const suggestedVideosContainer = document.querySelector("#related");
      if (suggestedVideosContainer) {
        // Insert the custom empty tab before the suggested videos container
        suggestedVideosContainer.insertAdjacentElement("beforebegin", emptyTab);
        observer.disconnect();  // Stop observing once the modification is complete
        return;  // Exit once the insertion is done
      }
    }
  };

  // Target the main container where elements are expected to load dynamically
  const observerTarget = document.body;

  // Create a new MutationObserver instance and start observing the target element
  const observer = new MutationObserver(observerCallback);
  observer.observe(observerTarget, { childList: true, subtree: true });  // Watch for added or removed child elements in the target
}

// Function to restore the page (remove the modification)
function restorePage() {
  // Reload the page to restore the original content and reset any changes
  location.reload();
}

// Check the toggle state from storage and execute accordingly
chrome.storage.sync.get(['isEnabled'], (result) => {
  // If the extension is enabled, insert the custom empty tab on YouTube
  if (result.isEnabled) {
    insertEmptyTabAboveSuggestedVideos();
  }
});

// Listen for toggle messages sent from window.js (extension popup or other scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If the toggle is enabled, insert the custom empty tab on YouTube
  if (message.isEnabled) {
    insertEmptyTabAboveSuggestedVideos();
  } else {
    // If the toggle is disabled, restore the page to its original state
    restorePage();
  }
});
