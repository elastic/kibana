/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VALUE_LISTS_MODAL_ACTIVATOR = '[data-test-subj="open-value-lists-modal-button"]';
export const VALUE_LISTS_TABLE = '[data-test-subj="value-lists-table"]';
export const VALUE_LISTS_ROW = '.euiTableRow';
export const VALUE_LIST_FILE_PICKER = '[data-test-subj="value-list-file-picker"]';
export const VALUE_LIST_FILE_UPLOAD_BUTTON = '[data-test-subj="value-lists-form-import-action"]';
export const VALUE_LIST_TYPE_SELECTOR = '[data-test-subj="value-lists-form-select-type-action"]';
export const VALUE_LIST_DELETE_BUTTON = (name: string) =>
  `[data-test-subj="action-delete-value-list-${name}"]`;
export const VALUE_LIST_FILES = '[data-test-subj*="action-delete-value-list-"]';
export const VALUE_LIST_CLOSE_BUTTON = '[data-test-subj="value-lists-flyout-close-action"]';
export const VALUE_LIST_EXPORT_BUTTON = '[data-test-subj="action-export-value-list"]';

export const VALUE_LIST_ITEMS_MODAL_TITLE = '[data-test-subj="value-list-items-modal-title"]';
export const VALUE_LIST_ITEMS_MODAL_INFO = '[data-test-subj="value-list-items-modal-info"]';
export const VALUE_LIST_ITEMS_MODAL_TABLE = '[data-test-subj="value-list-items-modal-table"]';
export const VALUE_LIST_ITEMS_MODAL_SEARCH_BAR =
  '[data-test-subj="value-list-items-modal-search-bar"]';
export const VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT =
  '[data-test-subj="value-list-items-modal-search-bar-input"]';

export const VALUE_LIST_ITEMS_ADD_BUTTON_SHOW_POPOVER =
  '[data-test-subj="value-list-item-add-button-show-popover"]';
export const VALUE_LIST_ITEMS_ADD_INPUT = '[data-test-subj="value-list-item-add-input"]';
export const VALUE_LIST_ITEMS_ADD_BUTTON_SUBMIT =
  '[data-test-subj="value-list-item-add-button-submit"]';
export const VALUE_LIST_ITEMS_FILE_PICKER = '[data-test-subj="value-list-items-file-picker"]';
export const VALUE_LIST_ITEMS_UPLOAD = '[data-test-subj="value-list-items-upload"]';
export const getValueListDeleteItemButton = (name: string) =>
  `[data-test-subj="delete-list-item-${name}"]`;
export const getValueListUpdateItemButton = (name: string) =>
  `[data-test-subj="value-list-item-update-${name}"]`;
