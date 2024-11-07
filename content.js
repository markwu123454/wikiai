// Function to create and insert the empty tab
function createEmptyTab() {
  // Select the target container by its class name
  const targetContainer = document.querySelector('.rfiSsc');
  const targetRemoveContainer = document.querySelector('.M8OgIe');

  if (targetContainer) {
    // Create a new div element for the empty tab
    const emptyTab = document.createElement("div");
    emptyTab.classList.add("custom-empty-tab");
    emptyTab.textContent = "Empty Tab";  // Placeholder text

    // Insert the empty tab directly after the target container
    targetContainer.parentNode.insertAfter(emptyTab, targetContainer.nextSibling);
  }
}

// Run the function when the DOM is fully loaded
window.addEventListener("load", createEmptyTab);
