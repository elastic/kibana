/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMEOUTS } from '../../../../constants/timeouts';
import type { TimelineLocators } from './timeline_locators';

/**
 * Actions for timeline tab navigation
 *
 * Handles:
 * - Switching between Query, Notes, Correlation (EQL), and ES|QL tabs
 */
export class TabNavigationActions {
  constructor(private readonly locators: TimelineLocators) {}

  /**
   * Switches to the Query tab
   */
  async goToQueryTab() {
    await this.locators.queryTabButton.click();
    await this.locators.queryInput.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the Notes tab
   */
  async goToNotesTab() {
    await this.locators.notesTabButton.click();
  }

  /**
   * Switches to the Correlation (EQL) tab
   */
  async goToCorrelationTab() {
    await this.locators.correlationTabButton.click();
    await this.locators.correlationTabContent.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the ES|QL tab
   */
  async goToEsqlTab() {
    await this.locators.esqlTabButton.click();
  }
}
