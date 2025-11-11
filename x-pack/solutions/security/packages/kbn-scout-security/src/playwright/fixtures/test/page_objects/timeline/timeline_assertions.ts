/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { TimelineLocators } from './timeline_locators';

/**
 * Assertion methods for verifying Timeline state
 *
 * All methods start with 'expect' to clearly indicate they are assertion methods.
 * These methods use Playwright's expect assertions which include auto-waiting
 * and provide clear error messages when assertions fail.
 */
export class TimelineAssertions {
  constructor(private readonly locators: TimelineLocators) {}

  /**
   * Asserts that the timeline query contains the expected text
   * @param expectedQuery - The expected query text
   */
  async expectQueryText(expectedQuery: string) {
    await expect(this.locators.queryInput).toHaveText(expectedQuery);
  }

  /**
   * Asserts that the timeline query contains text
   * @param text - The text to check for
   */
  async expectQueryContains(text: string) {
    await expect(this.locators.queryInput).toContainText(text);
  }

  /**
   * Asserts that the timeline is open
   */
  async expectTimelineOpen() {
    await expect(this.locators.timelineFlyout).toBeVisible();
  }

  /**
   * Asserts that the timeline is closed
   */
  async expectTimelineClosed() {
    await expect(this.locators.timelineFlyout).toBeHidden();
  }

  /**
   * Asserts the timeline title
   * @param expectedTitle - The expected title
   */
  async expectTimelineTitle(expectedTitle: string) {
    await expect(this.locators.timelineTitle).toHaveText(expectedTitle);
  }

  /**
   * Asserts the event count
   * @param expectedCount - The expected number of events
   */
  async expectEventCount(expectedCount: number) {
    await expect(this.locators.eventCount).toContainText(`${expectedCount}`);
  }
}
