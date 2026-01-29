/**
 * Share Button Functionality
 * Copies the current page URL to clipboard
 */

(function() {
  'use strict';

  // Get the share button
  const shareButton = document.getElementById('share-button');
  const shareFeedback = document.getElementById('share-feedback');

  if (!shareButton) {
    console.warn('Share button not found');
    return;
  }

  /**
   * Copy current page URL to clipboard
   */
  function copyToClipboard() {
    const currentUrl = window.location.href;

    // Use the modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl)
        .then(function() {
          showFeedback('Copied!');
        })
        .catch(function(err) {
          console.error('Failed to copy:', err);
          showFeedback('Failed');
        });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = currentUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        showFeedback('Copied!');
      } catch (err) {
        console.error('Failed to copy:', err);
        showFeedback('Failed');
      }

      document.body.removeChild(textarea);
    }
  }

  /**
   * Show feedback message
   */
  function showFeedback(message) {
    if (!shareFeedback) return;

    shareFeedback.textContent = message;
    shareFeedback.classList.add('show');

    setTimeout(function() {
      shareFeedback.classList.remove('show');
      setTimeout(function() {
        shareFeedback.textContent = '';
      }, 300);
    }, 2000);
  }

  // Add click event listener
  shareButton.addEventListener('click', copyToClipboard);

})();
