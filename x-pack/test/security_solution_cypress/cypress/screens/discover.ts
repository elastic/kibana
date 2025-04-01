/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector, getDataTestSubjectSelectorStartWith } from '../helpers/common';

export const DISCOVER_CONTAINER_TEST_ID = 'timeline-embedded-discover';
export const DISCOVER_CONTAINER = getDataTestSubjectSelector(DISCOVER_CONTAINER_TEST_ID);

export const DISCOVER_DATA_VIEW_SWITCHER = {
  BTN: getDataTestSubjectSelector('discover-dataView-switch-link'),
  INPUT: getDataTestSubjectSelector('indexPattern-switcher--input'),
  GET_DATA_VIEW: (title: string) => `.euiSelectableListItem[role=option][title^="${title}"]`,
  CREATE_NEW: getDataTestSubjectSelector('dataview-create-new'),
  TEXT_BASE_LANG_SWITCHER: getDataTestSubjectSelector('select-text-based-language-btn'),
};

export const DISCOVER_DATA_VIEW_EDITOR_FLYOUT = {
  MAIN: getDataTestSubjectSelector('indexPatternEditorFlyout'),
  NAME_INPUT: getDataTestSubjectSelector('createIndexPatternNameInput'),
  INDEX_PATTERN_INPUT: getDataTestSubjectSelector('createIndexPatternTitleInput'),
  USE_WITHOUT_SAVING_BTN: getDataTestSubjectSelector('exploreIndexPatternButton'),
  SAVE_DATA_VIEW_BTN: getDataTestSubjectSelector('saveIndexPatternButton'),
};

export const DISCOVER_ESQL_INPUT = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelector(
  'kibanaCodeEditor'
)}`;

export const DISCOVER_ESQL_INPUT_TEXT_CONTAINER = `${DISCOVER_ESQL_INPUT} .view-lines`;

export const DISCOVER_ESQL_EDITABLE_INPUT = `${DISCOVER_ESQL_INPUT} textarea`;

export const DISCOVER_ADD_FILTER = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelector(
  'addFilter'
)}`;

export const DISCOVER_FILTER_BADGES = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelectorStartWith(
  'filter-badge-'
)}`;

export const DISCOVER_RESULT_HITS = getDataTestSubjectSelector('discoverQueryHits');

export const DISCOVER_FIELDS_LOADING = getDataTestSubjectSelector(
  'fieldListGroupedAvailableFields-countLoading'
);

export const DISCOVER_DATA_GRID_UPDATING = getDataTestSubjectSelector('discoverDataGridUpdating');

export const UNIFIED_DATA_TABLE_LOADING = getDataTestSubjectSelector('unifiedDataTableLoading');

export const DISCOVER_NO_RESULTS = getDataTestSubjectSelector('discoverNoResults');

export const DISCOVER_TABLE = getDataTestSubjectSelector('docTable');

export const GET_DISCOVER_DATA_GRID_CELL = (columnId: string, rowIndex: number) => {
  return `${DISCOVER_TABLE} ${getDataTestSubjectSelector(
    'dataGridRowCell'
  )}[data-gridcell-column-id="${columnId}"][data-gridcell-row-index="${rowIndex}"] .unifiedDataTable__cellValue`;
};

export const GET_DISCOVER_DATA_GRID_CELL_HEADER = (columnId: string) =>
  getDataTestSubjectSelector(`dataGridHeaderCell-${columnId}`);

export const DISCOVER_CELL_ACTIONS = {
  FILTER_FOR: getDataTestSubjectSelector('filterForButton'),
  FILTER_OUT: getDataTestSubjectSelector('filterOutButton'),
  EXPAND_CELL_ACTIONS: getDataTestSubjectSelector('euiDataGridCellExpandButton'),
  EXPANSION_POPOVER: getDataTestSubjectSelector('euiDataGridExpansionPopover'),
  COPY: getDataTestSubjectSelector('copyClipboardButton'),
};

export const GET_DISCOVER_COLUMN = (columnId: string) =>
  `${getDataTestSubjectSelector(`dscFieldListPanelField-${columnId}`)}`;

export const GET_DISCOVER_COLUMN_TOGGLE_BTN = (columnId: string) =>
  `${getDataTestSubjectSelector(`fieldToggle-${columnId}`)}`;

export const DISCOVER_FIELD_SEARCH = `${getDataTestSubjectSelector(
  'fieldList'
)} ${getDataTestSubjectSelector('fieldListFiltersFieldSearch')}`;

export const DISCOVER_FIELD_LIST_LOADING = getDataTestSubjectSelector('fieldListLoading');

export const AVAILABLE_FIELD_COUNT = getDataTestSubjectSelector(
  'fieldListGroupedAvailableFields-count'
);
