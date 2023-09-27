/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreatMatchRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  AT_LEAST_ONE_INDEX_PATTERN,
  AT_LEAST_ONE_VALID_MATCH,
  COMBO_BOX_CLEAR_BTN,
  CUSTOM_QUERY_REQUIRED,
  INDICATOR_MATCH_TYPE,
  INVALID_MATCH_CONTENT,
  THREAT_COMBO_BOX_INPUT,
  THREAT_ITEM_ENTRY_DELETE_BUTTON,
  THREAT_MAPPING_COMBO_BOX_INPUT,
  THREAT_MATCH_AND_BUTTON,
  THREAT_MATCH_CUSTOM_QUERY_INPUT,
  THREAT_MATCH_INDICATOR_INDEX,
  THREAT_MATCH_INDICATOR_INDICATOR_INDEX,
  THREAT_MATCH_OR_BUTTON,
  THREAT_MATCH_QUERY_INPUT,
} from '../../screens/create_new_rule';
import { getDefineContinueButton } from './common/define_step';

export const selectIndicatorMatchType = () => {
  cy.get(INDICATOR_MATCH_TYPE).click({ force: true });
};

/**
 * Fills in the indicator match rows for tests by giving it an optional rowNumber,
 * a indexField, a indicatorIndexField, and an optional validRows which indicates
 * which row is valid or not.
 *
 * There are special tricks below with Eui combo box:
 * cy.get(`button[title="${indexField}"]`)
 * .should('be.visible')
 * .then(([e]) => e.click());
 *
 * To first ensure the button is there before clicking on the button. There are
 * race conditions where if the Eui drop down button from the combo box is not
 * visible then the click handler is not there either, and when we click on it
 * that will cause the item to _not_ be selected. Using a {enter} with the combo
 * box also does not select things from EuiCombo boxes either, so I have to click
 * the actual contents of the EuiCombo box to select things.
 */
export const fillIndicatorMatchRow = ({
  rowNumber,
  indexField,
  indicatorIndexField,
  validColumns,
}: {
  rowNumber?: number; // default is 1
  indexField: string;
  indicatorIndexField: string;
  validColumns?: 'indexField' | 'indicatorField' | 'both' | 'none'; // default is both are valid entries
}) => {
  const computedRowNumber = rowNumber == null ? 1 : rowNumber;
  const computedValueRows = validColumns == null ? 'both' : validColumns;
  cy.get(THREAT_MAPPING_COMBO_BOX_INPUT)
    .eq(computedRowNumber * 2 - 2)
    .eq(0)
    .type(indexField);
  if (computedValueRows === 'indexField' || computedValueRows === 'both') {
    cy.get(`button[title="${indexField}"]`).then(([e]) => e.click());
  }
  cy.get(THREAT_MAPPING_COMBO_BOX_INPUT)
    .eq(computedRowNumber * 2 - 1)
    .type(indicatorIndexField);

  if (computedValueRows === 'indicatorField' || computedValueRows === 'both') {
    cy.get(`button[title="${indicatorIndexField}"]`).then(([e]) => e.click());
  }
};

/**
 * Fills in both the index pattern and the indicator match index pattern.
 * @param indexPattern  The index pattern.
 * @param indicatorIndex The indicator index pattern.
 */
export const fillIndexAndIndicatorIndexPattern = (
  indexPattern?: string[],
  indicatorIndex?: string[]
) => {
  getIndexPatternClearButton().click();

  getIndicatorIndex().type(`${indexPattern}{enter}`);
  getIndicatorIndicatorIndex().type(`{backspace}{enter}${indicatorIndex}{enter}`);
};

/** Returns the indicator index drop down field. Pass in row number, default is 1 */
export const getIndicatorIndexComboField = (row = 1) =>
  cy.get(THREAT_COMBO_BOX_INPUT).eq(row * 2 - 2);

/** Returns the indicator mapping drop down field. Pass in row number, default is 1 */
export const getIndicatorMappingComboField = (row = 1) =>
  cy.get(THREAT_COMBO_BOX_INPUT).eq(row * 2 - 1);

/** Returns the indicator matches DELETE button for the mapping. Pass in row number, default is 1  */
export const getIndicatorDeleteButton = (row = 1) =>
  cy.get(THREAT_ITEM_ENTRY_DELETE_BUTTON).eq(row - 1);

/** Returns the indicator matches AND button for the mapping */
export const getIndicatorAndButton = () => cy.get(THREAT_MATCH_AND_BUTTON);

/** Returns the indicator matches OR button for the mapping */
export const getIndicatorOrButton = () => cy.get(THREAT_MATCH_OR_BUTTON);

/** Returns the invalid match content. */
export const getIndicatorInvalidationText = () => cy.contains(INVALID_MATCH_CONTENT);

/** Returns that at least one valid match is required content */
export const getIndicatorAtLeastOneInvalidationText = () => cy.contains(AT_LEAST_ONE_VALID_MATCH);

/** Returns that at least one index pattern is required content */
export const getIndexPatternInvalidationText = () => cy.contains(AT_LEAST_ONE_INDEX_PATTERN);

/** Returns the indicator index pattern */
export const getIndicatorIndex = () => {
  return cy.get(THREAT_MATCH_INDICATOR_INDEX).eq(0);
};

/** Returns the indicator's indicator index */
export const getIndicatorIndicatorIndex = () =>
  cy.get(THREAT_MATCH_INDICATOR_INDICATOR_INDEX).eq(0);

/** Returns the index pattern's clear button  */
export const getIndexPatternClearButton = () => cy.get(COMBO_BOX_CLEAR_BTN).first();

/** Returns the custom query input */
export const getCustomQueryInput = () => cy.get(THREAT_MATCH_CUSTOM_QUERY_INPUT).eq(0);

/** Returns the custom query input */
export const getCustomIndicatorQueryInput = () => cy.get(THREAT_MATCH_QUERY_INPUT).eq(0);

/** Returns custom query required content */
export const getCustomQueryInvalidationText = () => cy.contains(CUSTOM_QUERY_REQUIRED);

/**
 * Fills in the define indicator match rules and then presses the continue button
 * @param rule The rule to use to fill in everything
 */
export const fillDefineIndicatorMatchRuleAndContinue = (rule: ThreatMatchRuleCreateProps) => {
  if (rule.index) {
    fillIndexAndIndicatorIndexPattern(rule.index, rule.threat_index);
  }
  fillIndicatorMatchRow({
    indexField: rule.threat_mapping[0].entries[0].field,
    indicatorIndexField: rule.threat_mapping[0].entries[0].value,
  });
  getCustomIndicatorQueryInput().type('{selectall}{enter}*:*');
  getDefineContinueButton().should('exist').click({ force: true });
};
