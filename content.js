// Function to replace AI Overview with custom empty tab
function replaceAiOverview() {
  // Create a new <div> element for the custom empty tab
  const emptyTab = document.createElement("div");
  emptyTab.classList.add("custom-empty-tab");  // Add a custom class to the div for styling
  emptyTab.textContent = "Empty Tab";  // Set the text content of the tab

  // Target the container element where the AI Overview is located
  const observerTarget = document.getElementById("cnt");

  // MutationObserver callback function to observe changes in the DOM
  const observerCallback = function(mutationsList, observer) {
    // Loop through all mutations that happen in the target element
    for (const mutation of mutationsList) {
      // Look for the element with the class "M8OgIe" (AI Overview container)
      const targetElement = document.querySelector(".M8OgIe");
      if (targetElement) {
        // If the target element exists, replace it with the custom empty tab
        targetElement.replaceWith(emptyTab);
        observer.disconnect();  // Stop observing once the modification is complete
        break;  // Exit the loop once the replacement is done
      }
    }
  };

  // Create a new MutationObserver instance and start observing the target element
  const observer = new MutationObserver(observerCallback);
  observer.observe(observerTarget, { childList: true, subtree: true });  // Watch for added or removed child elements in the target
}

// Function to restore the page (remove the modification)
function restorePage() {
  // Try to find the element that was replaced (the AI Overview element)
  const targetElement = document.querySelector(".M8OgIe");
  if (targetElement) {
    // Reload the page to restore the original content and reset any changes
    location.reload();
  }
}

// Check the toggle state from storage and execute accordingly
chrome.storage.sync.get(['isEnabled'], (result) => {
  // If the extension is enabled, replace the AI Overview with the custom tab
  if (result.isEnabled) {
    replaceAiOverview();
  }
});

// Listen for toggle messages sent from window.js (extension popup or other scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If the toggle is enabled, replace the AI Overview with the custom tab
  if (message.isEnabled) {
    replaceAiOverview();
  } else {
    // If the toggle is disabled, restore the page to its original state
    restorePage();
  }
});
