/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GET_DATA_GRID_HEADER = (fieldName: string) => {
  return `[data-test-subj="dataGridHeaderCell-${fieldName}"]`;
};

export const GET_DATA_GRID_HEADER_ACTION_BUTTON = (fieldName: string) => {
  return `[data-test-subj="dataGridHeaderCellActionButton-${fieldName}"]`;
};

export const DATA_GRID_FIELDS = {
  TIMESTAMP: {
    fieldName: '@timestamp',
    label: '@timestamp',
  },
  ID: {
    fieldName: '_id',
    label: '_id',
  },
  RISK_SCORE: {
    fieldName: 'kibana.alert.risk_score',
    label: 'Risk Score',
  },

  RULE: {
    fieldName: 'kibana.alert.rule.name',
    label: 'Rule',
  },
};

export const GET_DATA_GRID_HEADER_CELL_ACTION_GROUP = (fieldName: string) => {
  return `[data-test-subj="dataGridHeaderCellActionGroup-${fieldName}"]`;
};

export const DATA_GRID_FULL_SCREEN =
  '[data-test-subj="alertsTable"] [data-test-subj="dataGridFullScreenButton"]';

export const DATA_GRID_FIELD_SORT_BTN = '[data-test-subj="dataGridColumnSortingButton"]';

export const DATA_GRID_COLUMN_ORDER_BTN = '[data-test-subj="dataGridColumnSelectorButton"]';
