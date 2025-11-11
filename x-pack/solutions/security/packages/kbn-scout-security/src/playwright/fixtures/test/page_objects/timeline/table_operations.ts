/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEOUTS } from '../../../../constants/timeouts';
import type { TimelineLocators } from './timeline_locators';

/**
 * Operations related to the timeline table
 *
 * Handles:
 * - Waiting for timeline to load
 * - Getting event counts
 * - Opening field browser
 */
export class TableOperations {
  constructor(private readonly locators: TimelineLocators) {}

  /**
   * Waits for the timeline to finish loading
   */
  async waitForTimelineToLoad() {
    // Wait for progress bar to appear
    await this.locators.timelineProgressBar
      .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_SHORT })
      .catch(() => {
        // Progress bar might not appear if load is very fast
      });

    // Wait for progress bar to disappear
    await this.locators.timelineProgressBar.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG,
    });
  }

  /**
   * Gets the event count from the timeline
   * @returns The number of events
   */
  async getEventCount(): Promise<number> {
    const text = await this.locators.eventCount.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Opens the field browser
   */
  async openFieldBrowser() {
    await this.locators.fieldBrowserButton.click();
  }
}
