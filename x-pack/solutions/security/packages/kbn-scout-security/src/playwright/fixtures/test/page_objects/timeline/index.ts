/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Timeline Page Object Module
 *
 * This module exports the refactored Timeline page object and its components.
 * The page object follows a composition pattern with specialized action classes
 * for different feature domains.
 *
 * @example
 * ```typescript
 * import { TimelinePage } from './page_objects/timeline';
 *
 * // Use the page object
 * const timelinePage = new TimelinePage(page);
 * await timelinePage.navigation.openTimeline();
 * await timelinePage.query.setQueryText('event.category: "security"');
 * await timelinePage.assertions.expectEventCount(10);
 * ```
 */

export { TimelinePage } from './timeline_page';
export { TimelineLocators } from './timeline_locators';
export { TimelineAssertions } from './timeline_assertions';
export { NavigationActions } from './navigation_actions';
export { TabNavigationActions } from './tab_navigation_actions';
export { QueryActions } from './query_actions';
export { SaveTimelineActions } from './save_timeline_actions';
export { DataProviderActions } from './data_provider_actions';
export { FilterActions } from './filter_actions';
export { TableOperations } from './table_operations';
