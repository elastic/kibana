/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATE_PICKER_ABSOLUTE_INPUT = '[data-test-subj="superDatePickerAbsoluteDateInput"]';

export const GET_LOCAL_DATE_PICKER_APPLY_BUTTON = (container: string) =>
  `${container} button[data-test-subj="querySubmitButton"]`;

export const GLOBAL_FILTERS_CONTAINER = `[data-test-subj="filters-global-container"]`;

export const GET_DATE_PICKER_APPLY_BUTTON = (container: string) =>
  `${container} [data-test-subj="querySubmitButton"]`;

export const LOCAL_DATE_PICKER_APPLY_BUTTON_TIMELINE =
  'button[data-test-subj="superDatePickerApplyTimeButton"]';

export const DATE_PICKER_APPLY_BUTTON_TIMELINE = `[data-test-subj="timeline-date-picker-container"] ${LOCAL_DATE_PICKER_APPLY_BUTTON_TIMELINE}`;

export const DATE_PICKER_ABSOLUTE_TAB = '[data-test-subj="superDatePickerAbsoluteTab"]';

export const DATE_PICKER_NOW_TAB = '[data-test-subj="superDatePickerNowTab"]';

export const DATE_PICKER_NOW_BUTTON = '[data-test-subj="superDatePickerNowButton"]';

export const GET_LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON = (container: string = '') =>
  `${container} [data-test-subj="superDatePickerendDatePopoverButton"]`;

export const GET_DATE_PICKER_END_DATE_POPOVER_BUTTON = (
  container: string = GLOBAL_FILTERS_CONTAINER
) => `${container} [data-test-subj="superDatePickerendDatePopoverButton"]`;

export const LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON =
  'button[data-test-subj="superDatePickerstartDatePopoverButton"]';

export const DATE_PICKER_START_DATE_POPOVER_BUTTON = `${GLOBAL_FILTERS_CONTAINER} ${LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON}`;

export const SHOW_DATES_BUTTON = `${GLOBAL_FILTERS_CONTAINER} [data-test-subj="superDatePickerShowDatesButton"]`;

export const GET_LOCAL_SHOW_DATES_BUTTON = (container: string) =>
  `${container} [data-test-subj="superDatePickerShowDatesButton"]`;

export const GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON = (container: string = '') =>
  `${container} [data-test-subj="superDatePickerstartDatePopoverButton"]`;
