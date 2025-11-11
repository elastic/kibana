/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineLocators } from './timeline_locators';

/**
 * Actions for timeline data provider operations
 *
 * Handles:
 * - Toggling data provider visibility
 * - Adding data providers to the timeline
 */
export class DataProviderActions {
  constructor(private readonly locators: TimelineLocators) {}

  /**
   * Toggles the data providers section visibility
   */
  async toggleDataProviders() {
    await this.locators.toggleDataProviderButton.click();
  }

  /**
   * Adds a data provider to the timeline
   * @param field - The field name
   * @param operator - The operator (e.g., 'is', 'is not')
   * @param value - The value
   */
  async addDataProvider(field: string, operator: string, value: string) {
    await this.toggleDataProviders();

    await this.locators.addFieldButton.click();
    await this.locators.dataProviderField.fill(field);
    await this.locators.dataProviderOperator.selectOption({ label: operator });
    await this.locators.dataProviderValue.fill(value);
    await this.locators.saveDataProviderButton.click();
  }
}
