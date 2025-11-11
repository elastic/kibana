/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEOUTS } from '../../../../constants/timeouts';
import type { TimelineLocators } from './timeline_locators';
import type { TableOperations } from './table_operations';

/**
 * Actions for timeline navigation, opening, closing, and creation
 *
 * Handles:
 * - Opening and closing the timeline flyout
 * - Creating new timelines
 * - Creating new timeline templates
 */
export class NavigationActions {
  constructor(
    private readonly locators: TimelineLocators,
    private readonly table: TableOperations
  ) {}

  /**
   * Opens the timeline flyout from the bottom bar
   */
  async openTimeline() {
    // Click the bottom bar button if timeline is not already open
    const isVisible = await this.locators.timelineFlyout.isVisible().catch(() => false);
    if (!isVisible) {
      await this.locators.bottomBarPlusButton.click();
      await this.locators.timelineFlyout.waitFor({
        state: 'visible',
        timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
      });
    }
  }

  /**
   * Closes the timeline flyout
   */
  async closeTimeline() {
    await this.locators.closeFlyoutButton.click();
    await this.locators.timelineFlyout.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Creates a new timeline
   */
  async createNewTimeline() {
    await this.openTimeline();
    await this.locators.newTimelineButton.click();
    await this.table.waitForTimelineToLoad();
  }

  /**
   * Creates a new timeline template
   */
  async createNewTemplate() {
    await this.openTimeline();
    await this.locators.bottomBarCreateNewTemplate.click();
    await this.table.waitForTimelineToLoad();
  }
}
