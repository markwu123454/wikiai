// Function to create the empty tab
function createEmptyTab() {
  // Find the AI Overview tab
  const aiOverviewTab = document.querySelector("selector-for-ai-overview-tab");  // Replace with the actual selector
  
  if (aiOverviewTab) {
    // Create a new div for the empty tab
    const emptyTab = document.createElement("div");
    emptyTab.classList.add("custom-empty-tab");
    emptyTab.textContent = "Empty Tab";  // Placeholder text

    // Insert the empty tab above the AI Overview tab
    aiOverviewTab.parentNode.insertBefore(emptyTab, aiOverviewTab);
  }
}

// Run the function when the DOM is fully loaded
window.addEventListener("load", createEmptyTab);
