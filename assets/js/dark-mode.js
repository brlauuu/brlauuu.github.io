/**
 * Dark Mode Toggle Functionality
 * Handles theme switching and localStorage persistence
 */

(function() {
  'use strict';

  // Get the toggle button
  const toggleButton = document.getElementById('dark-mode-toggle');

  if (!toggleButton) {
    console.warn('Dark mode toggle button not found');
    return;
  }

  /**
   * Get the current theme from localStorage or system preference
   */
  function getCurrentTheme() {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      return storedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Set the theme
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // Add click event listener to toggle button
  toggleButton.addEventListener('click', toggleTheme);

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      // Only update if user hasn't set a manual preference
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Ensure theme is set on page load
  const currentTheme = getCurrentTheme();
  setTheme(currentTheme);

})();
