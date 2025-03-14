/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelHistory } from '@kbn/expandable-flyout';

/**
 * Helper function that reverses the history array,
 * removes duplicates and the most recent item
 * @returns a history array of maxCount length
 */
export const getProcessedHistory = ({
  history,
  maxCount,
}: {
  history: FlyoutPanelHistory[];
  maxCount: number;
}): FlyoutPanelHistory[] => {
  // Step 1: reverse history so the most recent is first
  // We need to do this step first because we want to make sure that during step 2
  // we are removing only older duplicates.
  const reversedHistory = history.slice().reverse();

  // Step 2: remove duplicates
  // Because the lastOpen value will always be different, we're manually removing duplicates
  // by looking at the panel's information only.
  const uniquePanels = new Set<string>();
  const uniqueHistory = reversedHistory.filter((hist) => {
    const panelString = JSON.stringify(hist.panel);
    const entryDoesNotExists = !uniquePanels.has(panelString);
    if (entryDoesNotExists) {
      uniquePanels.add(panelString);
      return true;
    }
    return false;
  });

  // Omit the first (current opened) entry and return array of maxCount length
  return uniqueHistory.slice(1, maxCount + 1);
};
