(function capturePageMetadata() {
  const payload = {
    url: window.location.href,
    title: document.title || "",
    timestamp: Date.now()
  };

  chrome.runtime.sendMessage({ type: "capture-page", payload }, () => {
    if (chrome.runtime.lastError) {
      return;
    }
  });
})();
