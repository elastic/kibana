/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALL_CASES_CLOSED_CASES_STATS = '[data-test-subj="closedStatsHeader"] .euiStat__title';

export const ALL_CASES_COMMENTS_COUNT = '[data-test-subj="case-table-column-commentCount"]';

export const ALL_CASES_CREATE_NEW_CASE_BTN = '[data-test-subj="createNewCaseBtn"]';

export const ALL_CASES_CREATE_NEW_CASE_TABLE_BTN = '[data-test-subj="cases-table-add-case"]';

export const ALL_CASES_IN_PROGRESS_CASES_STATS =
  '[data-test-subj="inProgressStatsHeader"] .euiStat__title';

export const ALL_CASES_NAME = '[data-test-subj="case-details-link"]';

export const ALL_CASES_STATUS_FILTER = '[data-test-subj="options-filter-popover-button-status"]';

export const ALL_CASES_OPEN_FILTER = '[data-test-subj="options-filter-popover-item-open"]';

export const ALL_CASES_OPEN_CASES_STATS = '[data-test-subj="openStatsHeader"] .euiStat__title';

export const ALL_CASES_OPENED_ON = '[data-test-subj="case-table-column-createdAt"]';

export const ALL_CASES_PAGE_TITLE = '[data-test-subj="header-page-title"]';

export const ALL_CASES_SERVICE_NOW_INCIDENT =
  '[data-test-subj="case-table-column-external-notPushed"]';

export const ALL_CASES_TAGS = (tag: string) => {
  return `[data-test-subj="case-table-column-tags-${tag}"]`;
};

export const ALL_CASES_TAGS_COUNT = '[data-test-subj="options-filter-popover-button-tags"]';
