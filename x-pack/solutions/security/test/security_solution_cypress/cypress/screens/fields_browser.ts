/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FIELD_BROWSER_CLOSE_BTN = '[data-test-subj="close"]';

export const FIELDS_BROWSER_CONTAINER = '[data-test-subj="fields-browser-container"]';

export const FIELDS_BROWSER_CHECKBOX = (id: string) => {
  return `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-${id}-checkbox"]`;
};

export const FIELDS_BROWSER_FILTER_INPUT = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-search"]`;

export const FIELDS_BROWSER_VIEW_BUTTON = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="viewSelectorButton"]`;
const FIELDS_BROWSER_VIEW_MENU = '[data-test-subj="viewSelectorMenu"]';
export const FIELDS_BROWSER_VIEW_ALL = `${FIELDS_BROWSER_VIEW_MENU} [data-test-subj="viewSelectorOption-all"]`;
export const FIELDS_BROWSER_VIEW_SELECTED = `${FIELDS_BROWSER_VIEW_MENU} [data-test-subj="viewSelectorOption-selected"]`;

export const GET_FIELD_CHECKBOX = (fieldName: string) =>
  `${FIELDS_BROWSER_CONTAINER} [data-test-subj="field-${fieldName}-checkbox"]`;

export const FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES = `${FIELDS_BROWSER_CONTAINER} [data-test-subj="category-badges"]`;
