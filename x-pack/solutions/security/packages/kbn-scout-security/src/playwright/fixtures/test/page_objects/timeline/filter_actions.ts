/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineLocators } from './timeline_locators';
import type { TableOperations } from './table_operations';

/**
 * Actions for timeline filter operations
 *
 * Handles:
 * - Adding filters to the timeline
 */
export class FilterActions {
  constructor(
    private readonly locators: TimelineLocators,
    private readonly table: TableOperations
  ) {}

  /**
   * Adds a filter to the timeline
   * @param field - The field name
   * @param operator - The operator
   * @param value - The value
   */
  async addFilter(field: string, operator: string, value: string) {
    await this.locators.addFilterButton.click();
    await this.locators.filterFieldInput.fill(field);
    await this.locators.filterOperatorInput.selectOption({ label: operator });
    await this.locators.filterValueInput.fill(value);
    await this.locators.saveFilterButton.click();
    await this.table.waitForTimelineToLoad();
  }
}
