/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineLocators } from './timeline_locators';
import type { TableOperations } from './table_operations';

/**
 * Actions for timeline query operations
 *
 * Handles:
 * - Reading and setting query text
 * - Clearing queries
 * - Switching query languages (KQL/Lucene)
 */
export class QueryActions {
  constructor(
    private readonly locators: TimelineLocators,
    private readonly table: TableOperations
  ) {}

  /**
   * Gets the current query text from the timeline query input
   * @returns The query text
   */
  async getQueryText(): Promise<string> {
    return (await this.locators.queryInput.textContent()) || '';
  }

  /**
   * Sets the query text in the timeline
   * @param query - The query to set
   */
  async setQueryText(query: string) {
    await this.locators.queryInput.clear();
    await this.locators.queryInput.fill(query);
    await this.table.waitForTimelineToLoad();
  }

  /**
   * Clears the current query
   */
  async clearQuery() {
    await this.locators.queryInput.clear();
    await this.table.waitForTimelineToLoad();
  }

  /**
   * Switches the query language to KQL
   */
  async switchToKQL() {
    await this.locators.showQueryBarMenuButton.click();
    await this.locators.switchQueryLanguageButton.click();
    await this.locators.kqlLanguageButton.click();
  }

  /**
   * Switches the query language to Lucene
   */
  async switchToLucene() {
    await this.locators.showQueryBarMenuButton.click();
    await this.locators.switchQueryLanguageButton.click();
    await this.locators.luceneLanguageButton.click();
  }
}
