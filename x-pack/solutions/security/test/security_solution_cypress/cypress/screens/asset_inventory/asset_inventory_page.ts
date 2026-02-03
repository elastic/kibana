/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const ALL_ASSETS_TITLE = getDataTestSubjectSelector('asset-inventory-test-subj-page-title');
export const FLYOUT_RIGHT_PANEL = getDataTestSubjectSelector('rightSection');
export const FLYOUT_CARDS = getDataTestSubjectSelector('responsive-data-card');
export const DATAGRID_COLUMN_SELECTOR = getDataTestSubjectSelector('dataGridColumnSelectorButton');
export const DATAGRID_SORTING_SELECTOR = getDataTestSubjectSelector('dataGridColumnSortingButton');
export const DATAGRID_HEADER = getDataTestSubjectSelector('dataGridHeader');
export const TAKE_ACTION_BUTTON = getDataTestSubjectSelector('take-action-button');
export const INVESTIGATE_IN_TIMELINE_BUTTON = getDataTestSubjectSelector(
  'investigate-in-timeline-take-action-button'
);
export const TIMELINE_BODY = getDataTestSubjectSelector('timeline-body');
export const TYPE_FILTER_BOX = getDataTestSubjectSelector('optionsList-control-0');
export const NAME_FILTER_BOX = getDataTestSubjectSelector('optionsList-control-1');
export const ID_FILTER_BOX = getDataTestSubjectSelector('optionsList-control-2');

export const getFilterValueDataTestSubj = (value: string) =>
  getDataTestSubjectSelector('optionsList-control-selection-' + value);
