/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

/* Indicators Table */

export const INDICATORS_TABLE = getDataTestSubjectSelector('tiIndicatorsTable');
export const INDICATORS_TABLE_ROW_CELL = getDataTestSubjectSelector('dataGridRowCell');
export const INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER = getDataTestSubjectSelector(
  'dataGridHeaderCell-threat.indicator.name'
);
export const INDICATORS_TABLE_INDICATOR_NAME_CELL =
  '[data-gridcell-column-id="threat.indicator.name"]';
export const INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER = getDataTestSubjectSelector(
  'dataGridHeaderCell-threat.indicator.type'
);
export const INDICATORS_TABLE_INDICATOR_TYPE_CELL =
  '[data-gridcell-column-id="threat.indicator.type"]';
export const INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER = getDataTestSubjectSelector(
  'dataGridHeaderCell-threat.feed.name'
);
export const INDICATORS_TABLE_FEED_NAME_CELL = '[data-gridcell-column-id="threat.feed.name"]';
export const INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER = getDataTestSubjectSelector(
  'dataGridHeaderCell-threat.indicator.first_seen'
);
export const INDICATORS_TABLE_INDICATOR_FIRST_SEEN_CELL =
  '[data-gridcell-column-id="threat.indicator.first_seen"]';
export const INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER = getDataTestSubjectSelector(
  'dataGridHeaderCell-threat.indicator.last_seen'
);
export const INDICATORS_TABLE_INDICATOR_LAST_SEEN_CELL =
  '[data-gridcell-column-id="threat.indicator.last_seen"]';
export const TABLE_CONTROLS = getDataTestSubjectSelector('dataGridControls');
export const INDICATOR_TYPE_CELL = `[role="gridcell"][data-gridcell-column-id="threat.indicator.type"]`;
export const INDICATORS_TABLE_CELL_FILTER_IN_BUTTON = `${getDataTestSubjectSelector(
  'tiIndicatorsTableCellFilterInButton'
)} button`;
export const INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON = `${getDataTestSubjectSelector(
  'tiIndicatorsTableCellFilterOutButton'
)} button`;
export const INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON = getDataTestSubjectSelector(
  'tiIndicatorTableMoreActionsButton'
);

/* Flyout */

export const TOGGLE_FLYOUT_BUTTON = getDataTestSubjectSelector('tiToggleIndicatorFlyoutButton');
export const FLYOUT_CLOSE_BUTTON = getDataTestSubjectSelector('euiFlyoutCloseButton');
export const FLYOUT_TITLE = getDataTestSubjectSelector('tiIndicatorFlyoutTitle');
export const FLYOUT_TABS = getDataTestSubjectSelector('tiIndicatorFlyoutTabs');
export const FLYOUT_TABLE = getDataTestSubjectSelector('tiFlyoutTable');
export const FLYOUT_JSON = getDataTestSubjectSelector('tiFlyoutJsonCodeBlock');
export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutOverviewTableRowFilterInButton'
);
export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutOverviewTableRowFilterOutButton'
);
export const FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM = getDataTestSubjectSelector(
  'tiFlyoutOverviewHighLevelBlocksItem'
);
export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutOverviewHighLevelBlocksFilterInButton'
);
export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutOverviewHighLevelBlocksFilterOutButton'
);
export const FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE = getDataTestSubjectSelector(
  'tiFlyoutOverviewTableRow'
);
export const FLYOUT_TABLE_MORE_ACTIONS_BUTTON = `${getDataTestSubjectSelector(
  'tiFlyoutOverviewTableRowPopoverButton'
)} button`;
export const FLYOUT_BLOCK_MORE_ACTIONS_BUTTON = `${getDataTestSubjectSelector(
  'tiFlyoutOverviewHighLevelBlocksPopoverButton'
)} button`;
export const FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutTableFilterInButton'
);
export const FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutTableFilterOutButton'
);

export const FLYOUT_TAKE_ACTION_BUTTON = getDataTestSubjectSelector(
  'tiIndicatorFlyoutTakeActionButton'
);

/* Field selector */

export const FIELD_SELECTOR = getDataTestSubjectSelector('tiIndicatorFieldSelectorDropdown');
export const FIELD_SELECTOR_INPUT = getDataTestSubjectSelector('comboBoxSearchInput');
export const FIELD_SELECTOR_TOGGLE_BUTTON = getDataTestSubjectSelector('comboBoxToggleListButton');
export const FIELD_SELECTOR_LIST = getDataTestSubjectSelector(
  'comboBoxOptionsList tiIndicatorFieldSelectorDropdown-optionsList'
);

/* Field browser */

export const FIELD_BROWSER = getDataTestSubjectSelector('show-field-browser');
export const FIELD_BROWSER_MODAL = getDataTestSubjectSelector('fields-browser-container');
export const FIELD_BROWSER_MODAL_CLOSE_BUTTON = getDataTestSubjectSelector('close');

/* Barchart */

export const BARCHART_WRAPPER = getDataTestSubjectSelector('tiBarchartWrapper');
export const BARCHART_POPOVER_BUTTON = getDataTestSubjectSelector('tiBarchartPopoverButton');
export const BARCHART_TIMELINE_BUTTON = getDataTestSubjectSelector('tiBarchartTimelineButton');
export const BARCHART_FILTER_IN_BUTTON = getDataTestSubjectSelector('tiBarchartFilterInButton');
export const BARCHART_FILTER_OUT_BUTTON = getDataTestSubjectSelector('tiBarchartFilterOutButton');

/* Miscellaneous */

export const DEFAULT_LAYOUT_TITLE = getDataTestSubjectSelector('tiDefaultPageLayoutTitle');
export const BREADCRUMBS = getDataTestSubjectSelector('breadcrumbs');
export const LEADING_BREADCRUMB = getDataTestSubjectSelector('breadcrumb first');
export const ENDING_BREADCRUMB = getDataTestSubjectSelector('breadcrumb last');
export const FILTERS_GLOBAL_CONTAINER = getDataTestSubjectSelector('filters-global-container');
export const TIME_RANGE_PICKER = getDataTestSubjectSelector('superDatePickerToggleQuickMenuButton');
export const QUERY_INPUT = getDataTestSubjectSelector('queryInput');
export const EMPTY_STATE = getDataTestSubjectSelector('tiIndicatorsTableEmptyState');
export const INSPECTOR_BUTTON = getDataTestSubjectSelector('tiIndicatorsGridInspect');
export const INSPECTOR_PANEL = getDataTestSubjectSelector('inspectorPanel');
export const ADD_INTEGRATIONS_BUTTON = getDataTestSubjectSelector('add-data');
export const REFRESH_BUTTON = getDataTestSubjectSelector('querySubmitButton');
export const ADDED_TO_TIMELINE_TOAST = getDataTestSubjectSelector('add-to-timeline-toast-success');
