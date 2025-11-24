/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEOUTS } from '../../../../constants/timeouts';
import type { TimelineLocators } from './timeline_locators';

/**
 * Actions for saving and managing timelines
 *
 * Handles:
 * - Saving timelines with title and description
 * - Saving as new timeline
 * - Marking timelines as favorites
 */
export class SaveTimelineActions {
  constructor(private readonly locators: TimelineLocators) {}

  /**
   * Saves the timeline with a title and optional description
   * @param title - The timeline title
   * @param description - Optional description
   */
  async saveTimeline(title: string, description?: string) {
    await this.locators.saveTimelineButton.click();
    await this.locators.saveTimelineModal.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.locators.timelineTitleInput.clear();
    await this.locators.timelineTitleInput.fill(title);

    if (description) {
      await this.locators.timelineDescriptionInput.clear();
      await this.locators.timelineDescriptionInput.fill(description);
    }

    await this.locators.saveTimelineModalSaveButton.click();
    await this.locators.saveTimelineModal.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Saves the timeline as a new copy
   * @param title - The new timeline title
   * @param description - Optional description
   */
  async saveTimelineAsNew(title: string, description?: string) {
    await this.locators.saveTimelineButton.click();
    await this.locators.saveTimelineModal.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.locators.saveAsNewSwitch.click();

    await this.locators.timelineTitleInput.clear();
    await this.locators.timelineTitleInput.fill(title);

    if (description) {
      await this.locators.timelineDescriptionInput.clear();
      await this.locators.timelineDescriptionInput.fill(description);
    }

    await this.locators.saveTimelineModalSaveButton.click();
    await this.locators.saveTimelineModal.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Marks the timeline as favorite by clicking the star icon
   */
  async markAsFavorite() {
    await this.locators.starIcon.click();
  }
}
