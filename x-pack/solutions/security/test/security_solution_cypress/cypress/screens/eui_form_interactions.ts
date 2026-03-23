/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EUI_COMBO_BOX_SELECTOR = '[data-test-subj="comboBoxInput"]';

export const EUI_COMBO_BOX_SELECTIONS_SELECTOR = `${EUI_COMBO_BOX_SELECTOR} [data-test-subj="euiComboBoxPill"]`;

export const EUI_COMBO_BOX_INPUT_SELECTOR = `${EUI_COMBO_BOX_SELECTOR} input`;

/**
 * @param parentSelector CSS Selector targeting the parent EuiComboBox component
 * @returns A selector targeting the inner combobox element to be interacted with
 */
export const getComboBoxSelector = (parentSelector?: string): string =>
  `${parentSelector} ${EUI_COMBO_BOX_SELECTOR}`;

/**
 * @param parentSelector CSS Selector targeting the parent EuiComboBox component
 * @returns A selector targeting the actual combobox <input /> element
 */
export const getComboBoxInputSelector = (parentSelector?: string): string =>
  `${parentSelector} ${EUI_COMBO_BOX_INPUT_SELECTOR}`;

/**
 * @param parentSelector CSS Selector targeting the parent EuiComboBox component
 * @returns A selector targeting the selected options on the EuiComboBox
 */
export const getComboBoxSelectionsSelector = (parentSelector?: string): string =>
  `${parentSelector} ${EUI_COMBO_BOX_SELECTIONS_SELECTOR}`;
