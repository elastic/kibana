/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const TIMELINE_DETAILS_FLYOUT_BTN = getDataTestSubjectSelector('docTableExpandToggleColumn');

export const HOST_DETAILS_LINK = getDataTestSubjectSelector('host-details-button');

export const USER_DETAILS_LINK = getDataTestSubjectSelector('users-link-anchor');

export const TIMELINE_DETAILS_FLYOUT = getDataTestSubjectSelector('securitySolutionFlyoutBody');

export const HOST_DETAILS_FLYOUT = getDataTestSubjectSelector('host-panel-header');

export const USER_DETAILS_FLYOUT = getDataTestSubjectSelector('user-panel-header');

export const TIMELINE_DETAILS_FLYOUT_CLOSE_BTN = getDataTestSubjectSelector('euiFlyoutCloseButton');

export const TIMELINE_UNIFIED_DATA_GRID = `${getDataTestSubjectSelector(
  'timelineUnifiedComponentsLayoutResizablePanelFlex'
)} ${getDataTestSubjectSelector('docTable')}`;

export const CELL_FILTER_IN_BUTTON = getDataTestSubjectSelector(
  'dataGridColumnCellAction-security-default-cellActions-filterIn'
);

export const CELL_FILTER_OUT_BUTTON = getDataTestSubjectSelector(
  'dataGridColumnCellAction-security-default-cellActions-filterOut'
);

export const CELL_ADD_TO_TIMELINE_BUTTON = getDataTestSubjectSelector(
  'dataGridColumnCellAction-security-default-cellActions-addToTimeline'
);

export const CELL_SHOW_TOP_FIELD_BUTTON = getDataTestSubjectSelector(
  'dataGridColumnCellAction-security-default-cellActions-showTopN'
);

export const GET_UNIFIED_DATA_GRID_CELL_HEADER = (columnId: string) =>
  getDataTestSubjectSelector(`dataGridHeaderCell-${columnId}`);

export const GET_UNIFIED_DATA_GRID_CELL = (columnId: string, rowIndex: number) => {
  return `${TIMELINE_UNIFIED_DATA_GRID} ${getDataTestSubjectSelector(
    'dataGridRowCell'
  )}[data-gridcell-column-id="${columnId}"][data-gridcell-row-index="${rowIndex}"] .unifiedDataTable__cellValue`;
};
