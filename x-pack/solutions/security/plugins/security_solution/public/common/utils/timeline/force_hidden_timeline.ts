/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TIMELINE_SELECTOR = '[data-test-subj="timeline-bottom-bar-container"]';

/**
 * A utility function to forcefully hide the timeline bottom bar.
 * This is useful for scenarios where the timeline should not be visible, such as during onboarding or initialization.
 * @param hidden Whether the timeline should be forced hidden or have the default visibility.
 */
export const forceHiddenTimeline = (hidden: boolean) => {
  let element: HTMLElement | null = null;
  const timeout = setTimeout(() => {
    // Use a timeout to ensure the element is available in the DOM
    // This is necessary because the element might not be rendered immediately
    element = document.querySelector(TIMELINE_SELECTOR);
    if (element) {
      if (hidden) {
        element.style.display = 'none';
      } else {
        element.style.removeProperty('display');
      }
    }
  });

  // Return the cleanup function to clear the timeout
  return () => {
    clearTimeout(timeout);
    if (element) {
      element.style.removeProperty('display');
    }
  };
};
