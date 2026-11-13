/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Click actions of Digital Experience that `EBT_CLICK_ACTIONS` from `@kbn/ebt-click` has no shared
 * name for; named after the user's intent, as that package asks.
 */
export const DIGITAL_EXPERIENCE_EBT_ACTIONS = {
  /** The user opens a filter's options. */
  OPEN_FILTER: 'openFilter',
  /** The user narrows the list, e.g. to one environment or source. */
  SET_FILTER: 'setFilter',
  /** The user leaves a value out of the data, e.g. every Chrome page load. */
  EXCLUDE_FILTER_VALUE: 'excludeFilterValue',
  /** The user opens the list of columns to show or hide. */
  SELECT_COLUMNS: 'selectColumns',
  /** The user loads the list again after it failed. */
  RETRY_LOAD: 'retryLoad',
  /** The user sets up sessions, or updates them. */
  ENABLE_SESSIONS: 'enableSessions',
  /** The user opens the sessions list narrowed to what they clicked, e.g. a browser. */
  VIEW_SESSIONS: 'viewSessions',
  /** The user opens the full list behind a summary, e.g. every error from the Overview. */
  VIEW_ALL: 'viewAll',
  /** The user opens a session's details. */
  VIEW_SESSION: 'viewSession',
  /** The user jumps from the session timeline to one of its page visits. */
  SELECT_PAGE_VISIT: 'selectPageVisit',
  /** The user leaves a session for the sessions list. */
  BACK_TO_SESSIONS: 'backToSessions',
  /** The user clears the list's search and filters. */
  CLEAR_FILTERS: 'clearFilters',
  /** The user closes the filters flyout without applying what they picked. */
  CANCEL_FILTERS: 'cancelFilters',
  /** The user opens the details of a request, an error or folded requests in a page visit. */
  EXPAND_ACTIVITY: 'expandActivity',
  /** The user leaves for the distributed trace of a request. */
  VIEW_TRACE: 'viewTrace',
  /** The user opens the raw events behind a page in Discover. */
  OPEN_IN_DISCOVER: 'openInDiscover',
  /** The user shows or hides the sessions list beside a session. */
  TOGGLE_SESSIONS_LIST: 'toggleSessionsList',
  /** The user moves to another page of a list. */
  CHANGE_PAGE: 'changePage',
  /** The user closes details they opened, e.g. a cluster of the sessions map. */
  CLOSE_DETAILS: 'closeDetails',
  /** The user switches the sessions beside a session between the list and the map. */
  SWITCH_SESSIONS_VIEW: 'switchSessionsView',
} as const;

/*
 * Clicks already carry the app in their `applicationId` context (`digital_experience`), so element
 * names don't repeat it.
 */

/** Elements that more than one page shows. */
export const DIGITAL_EXPERIENCE_EBT_ELEMENTS = {
  ENVIRONMENT_FILTER: 'environmentFilter',
  INSTRUMENTATION_DOCS_LINK: 'instrumentationDocsLink',
} as const;

export const APPLICATIONS_LIST_EBT_ELEMENTS = {
  APPLICATION_LINK: 'applicationLink',
  DOCS_LINK: 'applicationsDocsLink',
  CLASSIC_DATA_HINT: 'classicDataHint',
  SOURCE_FILTER: 'sourceFilter',
  COLUMN_SELECTOR: 'columnSelector',
  RETRY: 'applicationsRetry',
  SHOW_ALL_ENVIRONMENTS: 'showAllEnvironments',
} as const;

export const APPLICATION_OVERVIEW_EBT_ELEMENTS = {
  RETRY: 'overviewRetry',
  USAGE_RETRY: 'overviewUsageRetry',
  BROWSER_SESSIONS_LINK: 'overviewBrowserSessionsLink',
  OS_SESSIONS_LINK: 'overviewOsSessionsLink',
  BROWSER_FILTER: 'overviewBrowserFilter',
  OS_FILTER: 'overviewOsFilter',
  DEVICE_FILTER: 'overviewDeviceFilter',
  COUNTRY_FILTER: 'overviewCountryFilter',
  APP_VERSION_FILTER: 'overviewAppVersionFilter',
  PAGE_FILTER: 'overviewPageFilter',
  PAGE_CONTAINS_FILTER: 'overviewPageContainsFilter',
  ALL_FILTERS: 'overviewAllFilters',
  ALL_FILTERS_APPLY: 'overviewAllFiltersApply',
  ALL_FILTERS_CANCEL: 'overviewAllFiltersCancel',
  ALL_FILTERS_RESET: 'overviewAllFiltersReset',
  CLEAR_FILTERS: 'overviewClearFilters',
  PERCENTILE: 'overviewPercentile',
} as const;

export const ERRORS_EBT_ELEMENTS = {
  RETRY: 'errorsRetry',
  ERROR: 'errorsError',
  VIEW_ALL: 'errorsViewAll',
  CLEAR_KUERY: 'errorsClearKuery',
} as const;

export const NETWORK_EBT_ELEMENTS = {
  RETRY: 'networkRetry',
  RENDER_BLOCKING_FILTER: 'networkRenderBlockingFilter',
} as const;

export const SESSIONS_EBT_ELEMENTS = {
  ENABLE: 'sessionsEnable',
  UPDATE: 'sessionsUpdate',
  RETRY: 'sessionsRetry',
  SESSION_RETRY: 'sessionRetry',
  SESSION_LINK: 'sessionLink',
  ERRORS_FILTER: 'sessionsErrorsFilter',
  FAILED_REQUESTS_FILTER: 'sessionsFailedRequestsFilter',
  DURATION_FILTER: 'sessionsDurationFilter',
  BROWSER_FILTER: 'sessionsBrowserFilter',
  OS_FILTER: 'sessionsOsFilter',
  COUNTRY_FILTER: 'sessionsCountryFilter',
  ENTRY_PAGE_FILTER: 'sessionsEntryPageFilter',
  CLEAR_FILTERS: 'sessionsClearFilters',
  WATERFALL_PAGE: 'sessionWaterfallPage',
  DOCS_LINK: 'sessionsDocsLink',
  COLUMN_SELECTOR: 'sessionsColumnSelector',
  SESSION_NOT_FOUND_BACK: 'sessionNotFoundBack',
  ACTIVITY_KIND_FILTER: 'sessionActivityKindFilter',
  ACTIVITY_SEARCH: 'sessionActivitySearch',
  ACTIVITY_ROW: 'sessionActivityRow',
  ACTIVITY_SHOW_ALL: 'sessionActivityShowAll',
  RAIL_SESSION: 'sessionsRailSession',
  RAIL_HIDE: 'sessionsRailHide',
  RAIL_EDIT_FILTERS: 'sessionsRailEditFilters',
  RAIL_PAGE: 'sessionsRailPage',
  RAIL_VIEW: 'sessionsRailView',
  MAP_AREA_FILTER: 'sessionsMapAreaFilter',
  MAP_SEARCH_AS_MOVED: 'sessionsMapSearchAsMoved',
  MAP_CLUSTER_SESSION: 'sessionsMapClusterSession',
  MAP_CLUSTER_SHOW_ALL: 'sessionsMapClusterShowAll',
  MAP_CLUSTER_CLOSE: 'sessionsMapClusterClose',
  MAP_CLEAR_AREA: 'sessionsMapClearArea',
  TRACE_LINK: 'sessionTraceLink',
} as const;
