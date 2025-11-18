/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const DISCOVER_CONTAINER_TEST_ID = 'timeline-embedded-discover';
export const DISCOVER_CONTAINER = getDataTestSubjectSelector(DISCOVER_CONTAINER_TEST_ID);

export const DISCOVER_DATA_VIEW_SWITCHER = {
  BTN: getDataTestSubjectSelector('discover-dataView-switch-link'),
  INPUT: getDataTestSubjectSelector('indexPattern-switcher--input'),
  CREATE_NEW: getDataTestSubjectSelector('dataview-create-new'),
  TEXT_BASE_LANG_SWITCHER: getDataTestSubjectSelector('select-text-based-language-btn'),
};

export const DISCOVER_ESQL_INPUT = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelector(
  'kibanaCodeEditor'
)}`;

export const DISCOVER_ESQL_INPUT_TEXT_CONTAINER = `${DISCOVER_ESQL_INPUT} .view-lines`;

export const DISCOVER_ESQL_EDITABLE_INPUT = `${DISCOVER_ESQL_INPUT} textarea`;

export const DISCOVER_RESULT_HITS = getDataTestSubjectSelector('discoverQueryHits');

export const GET_DISCOVER_DATA_GRID_CELL_HEADER = (columnId: string) =>
  getDataTestSubjectSelector(`dataGridHeaderCell-${columnId}`);

export const GET_DISCOVER_COLUMN_TOGGLE_BTN = (columnId: string) =>
  `${getDataTestSubjectSelector(`fieldToggle-${columnId}`)}`;

export const DISCOVER_FIELD_SEARCH = `${getDataTestSubjectSelector(
  'fieldList'
)} ${getDataTestSubjectSelector('fieldListFiltersFieldSearch')}`;

export const DISCOVER_FIELD_LIST_LOADING = getDataTestSubjectSelector('fieldListLoading');

export const AVAILABLE_FIELD_COUNT = getDataTestSubjectSelector(
  'fieldListGroupedAvailableFields-count'
);

export const TIMELINE_DISCOVER_TAB = getDataTestSubjectSelector('timeline-tab-content-esql');

export const GET_DISCOVER_FIELD_BROWSER_FIELD_DETAILS_BUTTON = (fieldId: string) =>
  getDataTestSubjectSelector(`field-${fieldId}-showDetails`);

export const GET_DISCOVER_FIELD_BROWSER_POPOVER_FIELD_ADD_BUTTON = (fieldId: string) =>
  getDataTestSubjectSelector(`fieldPopoverHeader_addField-${fieldId}`);
