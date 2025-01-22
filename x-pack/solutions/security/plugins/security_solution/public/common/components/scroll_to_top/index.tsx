/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

/**
 * containerSelector: The element with scrolling. It defaults to the window.
 * shouldScroll: It should be used for conditional scrolling.
 */
export const useScrollToTop = (containerSelector?: string, shouldScroll = true) => {
  useEffect(() => {
    const container = containerSelector ? document.querySelector(containerSelector) : window;

    if (!shouldScroll || !container) return;

    // trying to use new API - https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo
    if (container.scroll) {
      container.scroll(0, 0);
    } else {
      // just a fallback for older browsers
      container.scrollTo(0, 0);
    }
  });

  // renders nothing, since nothing is needed
  return null;
};
