/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const CONTROL_GROUP = '[data-test-subj="controls-group"]';
export const CONTROL_FRAMES = '[data-test-subj="control-frame"]';

export const CONTROL_FRAME_TITLE = '[data-test-subj="control-frame-title"]';

export const OPTION_LIST_LABELS = '.controlFrame__labelToolTip';

export const OPTION_LIST_VALUES = (idx: number) => `[data-test-subj="optionsList-control-${idx}"]`;

export const OPTION_LIST_CLEAR_BTN = '.presentationUtil__floatingActions [aria-label="Clear"]';

export const OPTION_LISTS_LOADING = '.optionsList--filterBtnWrapper .euiLoadingSpinner';

export const OPTION_SELECTABLE = (popoverIndex: number, value: string) =>
  `#control-popover-${popoverIndex} [data-test-subj="optionsList-control-selection-${value}"]`;

export const OPTION_SELECTABLE_COUNT = getDataTestSubjectSelector(
  'optionsList-document-count-badge'
);

export const CONTROL_POPOVER = (popoverIdx: number) => `#control-popover-${popoverIdx}`;

export const DETECTION_PAGE_FILTER_GROUP_WRAPPER = '.filter-group__wrapper';

export const DETECTION_PAGE_FILTERS_LOADING = '.securityPageWrapper .controlFrame--controlLoading';

export const DETECTION_PAGE_FILTER_GROUP_LOADING = '[data-test-subj="filter-group__loading"]';

export const DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU_BTN =
  '[data-test-subj="filter-group__context"]';

export const DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU =
  '[data-test-subj="filter-group__context-menu"]';

export const DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON =
  '[data-test-subj="filter-group__context--reset"]';

export const FILTER_GROUP_CONTEXT_EDIT_CONTROLS = '[data-test-subj="filter-group__context--edit"]';

export const FILTER_GROUP_CONTEXT_DISCARD_CHANGES =
  '[data-test-subj="filter-group__context--discard"]';

export const FILTER_GROUP_ADD_CONTROL = '[data-test-subj="filter-group__add-control"]';

export const FILTER_GROUP_SAVE_CHANGES = '[data-test-subj="filter-group__save"]';

export const FILTER_GROUP_EDIT_CONTROLS_PANEL = '[data-test-subj="control-editor-flyout"]';

export const FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS = {
  FIELD_SEARCH: '[data-test-subj="field-search-input"]',
  FIELD_PICKER: (fieldName: string) => `[data-test-subj="field-picker-select-${fieldName}"]`,
  FIELD_LABEL: '[data-test-subj="control-editor-title-input"]',
  SAVE: '[data-test-subj="control-editor-save"]',
  CANCEL: getDataTestSubjectSelector('control-editor-cancel'),
  FILTER_FIELD_TYPE: getDataTestSubjectSelector('toggleFieldFilterButton'),
  FIELD_TYPES: {
    STRING: getDataTestSubjectSelector('typeFilter-string'),
    BOOLEAN: getDataTestSubjectSelector('typeFilter-boolean'),
    IP: getDataTestSubjectSelector('typeFilter-ip'),
    NUMBER: getDataTestSubjectSelector('typeFilter-number'),
  },
};

export const FILTER_GROUP_CONTROL_ACTION_DELETE = (idx: number) => {
  return `[data-test-subj="control-action-${idx}-delete"]`;
};

export const FILTER_GROUP_CONTROL_ACTION_EDIT = (idx: number) => {
  return `[data-test-subj="control-action-${idx}-edit"]`;
};

export const FILTER_GROUP_CONTROL_CONFIRM_DIALOG = `[data-test-subj="confirmModalTitleText"]`;
export const FILTER_GROUP_CONTROL_CONFIRM_BTN = `[data-test-subj="confirmModalConfirmButton"]`;

export const FILTER_GROUP_CHANGED_BANNER = `[data-test-subj="filter-group--changed-banner"]`;
