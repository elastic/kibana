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
  /** The user opens the list of columns to show or hide. */
  SELECT_COLUMNS: 'selectColumns',
  /** The user loads the list again after it failed. */
  RETRY_LOAD: 'retryLoad',
  /** The user sets up sessions, or updates them. */
  ENABLE_SESSIONS: 'enableSessions',
  /** The user opens a session's details. */
  VIEW_SESSION: 'viewSession',
  /** The user leaves a session for the sessions list. */
  BACK_TO_SESSIONS: 'backToSessions',
  /** The user copies a session's ID. */
  COPY_SESSION_ID: 'copySessionId',
  /** The user clears the list's search and filters. */
  CLEAR_FILTERS: 'clearFilters',
} as const;

/*
 * Clicks already carry the app in their `applicationId` context (`digital_experience`), so element
 * names don't repeat it.
 */

/** Elements that more than one page shows. */
export const DIGITAL_EXPERIENCE_EBT_ELEMENTS = {
  ENVIRONMENT_FILTER: 'environmentFilter',
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
} as const;

export const SESSIONS_EBT_ELEMENTS = {
  ENABLE: 'sessionsEnable',
  UPDATE: 'sessionsUpdate',
  RETRY: 'sessionsRetry',
  SESSION_RETRY: 'sessionRetry',
  SESSION_LINK: 'sessionLink',
  ERRORS_FILTER: 'sessionsErrorsFilter',
  DURATION_FILTER: 'sessionsDurationFilter',
  BROWSER_FILTER: 'sessionsBrowserFilter',
  OS_FILTER: 'sessionsOsFilter',
  COUNTRY_FILTER: 'sessionsCountryFilter',
  ENTRY_PAGE_FILTER: 'sessionsEntryPageFilter',
  CLEAR_FILTERS: 'sessionsClearFilters',
  DOCS_LINK: 'sessionsDocsLink',
  SESSION_BACK: 'sessionBack',
  SESSION_NOT_FOUND_BACK: 'sessionNotFoundBack',
  SESSION_ID_COPY: 'sessionIdCopy',
} as const;
