// Function to create and insert the empty tab
function createEmptyTab() {
  // Select the target container by its class name
  const targetContainer = document.querySelector('.rfiSsc');
  const targetRemoveContainer = document.querySelector('.M8OgIe');

  if (targetContainer) {
    // Create a new div element for the empty tab
    // Create your custom element
    const emptyTab = document.createElement("div");
    emptyTab.classList.add("custom-empty-tab");
    emptyTab.textContent = "Empty Tab";  // Placeholder text

// Select a reliable parent container like `#cnt` or `#rcnt`
    const observerTarget = document.getElementById("cnt");

// Define the callback function for the observer
    const observerCallback = function(mutationsList, observer) {
      for (const mutation of mutationsList) {
        // Attempt to locate the specific child element to replace (initially with a broad search for divs)
        const targetElement = document.querySelector(".M8OgIe");

        // If the target element is found, replace it
        if (targetElement) {
          targetElement.replaceWith(emptyTab);

          // Optionally, stop observing once the replacement is done
          observer.disconnect();
          break;
        }
      }
    };

// Set up the observer
    const observer = new MutationObserver(observerCallback);

// Observe the target container for changes in its child elements
    observer.observe(observerTarget, { childList: true, subtree: true });


    // Insert the empty tab directly after the target container
    targetContainer.parentNode.insertBefore(emptyTab, targetContainer.nextSibling);
  }
}

// Run the function when the DOM is fully loaded
window.addEventListener("load", createEmptyTab);
