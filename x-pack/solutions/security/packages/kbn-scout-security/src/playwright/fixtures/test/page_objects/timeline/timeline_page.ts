/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { TimelineLocators } from './timeline_locators';
import { NavigationActions } from './navigation_actions';
import { TabNavigationActions } from './tab_navigation_actions';
import { QueryActions } from './query_actions';
import { SaveTimelineActions } from './save_timeline_actions';
import { DataProviderActions } from './data_provider_actions';
import { FilterActions } from './filter_actions';
import { TableOperations } from './table_operations';
import { TimelineAssertions } from './timeline_assertions';

/**
 * Page Object for the Timeline component in Kibana Security Solution
 *
 * Timeline is a powerful investigation tool that allows users to query and analyze
 * security events, create data providers, and save investigations.
 *
 * This class acts as an orchestrator, delegating to specialized action classes
 * for different feature domains (navigation, tabs, queries, saving, etc.).
 *
 * @example
 * ```typescript
 * // Navigate and interact with timeline
 * await timelinePage.navigation.openTimeline();
 * await timelinePage.query.setQueryText('event.category: "security"');
 * await timelinePage.save.saveTimeline('Investigation 1');
 * await timelinePage.assertions.expectEventCount(10);
 * ```
 */
export class TimelinePage {
  /**
   * Locators for all Timeline elements
   *
   * Note: Prefer using the action classes (navigation, query, etc.)
   * over accessing locators directly. Locators are exposed for flexibility in tests
   * that need direct element access.
   */
  public readonly locators: TimelineLocators;

  /**
   * Actions related to opening, closing, and creating timelines
   */
  public readonly navigation: NavigationActions;

  /**
   * Actions related to tab navigation (Query, Notes, Correlation, ES|QL)
   */
  public readonly tabs: TabNavigationActions;

  /**
   * Actions related to query operations
   * (get/set query text, clear, switch language)
   */
  public readonly query: QueryActions;

  /**
   * Actions related to saving and managing timelines
   * (save, save as new, mark favorite)
   */
  public readonly save: SaveTimelineActions;

  /**
   * Actions related to data providers
   */
  public readonly dataProviders: DataProviderActions;

  /**
   * Actions related to filters
   */
  public readonly filters: FilterActions;

  /**
   * Operations related to the timeline table
   * (wait, get event count, open field browser)
   */
  public readonly table: TableOperations;

  /**
   * Assertion methods for verifying Timeline state
   * (expect* methods)
   */
  public readonly assertions: TimelineAssertions;

  constructor(page: ScoutPage) {
    // Initialize locators (shared by all action classes)
    this.locators = new TimelineLocators(page);

    // Initialize table operations first (needed by other action classes)
    this.table = new TableOperations(this.locators);

    // Initialize action classes with dependencies
    this.navigation = new NavigationActions(this.locators, this.table);
    this.tabs = new TabNavigationActions(this.locators);
    this.query = new QueryActions(this.locators, this.table);
    this.save = new SaveTimelineActions(this.locators);
    this.dataProviders = new DataProviderActions(this.locators);
    this.filters = new FilterActions(this.locators, this.table);
    this.assertions = new TimelineAssertions(this.locators);
  }
}
