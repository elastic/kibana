/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper function to generate selector by data-test-subj
 * @param dataTestSubjectValue the value passed to the data-test-subj property of the DOM element
 */
export const getDataTestSubjectSelector = (dataTestSubjectValue: string) =>
  `[data-test-subj="${dataTestSubjectValue}"]`;

/**
 * Helper function to generate selector by data-test-subj that start with the value
 * @param dataTestSubjectValue the partial value passed to the data-test-subj property of the DOM element
 */
export const getDataTestSubjectSelectorStartWith = (dataTestSubjectValue: string) =>
  `[data-test-subj^="${dataTestSubjectValue}"]`;

/**
 * Helper function to generate selector by class
 * @param className the value passed to class property of the DOM element
 */
export const getClassSelector = (className: string) => `.${className}`;

/**
 * Assert that a checkbox is checked
 * @param selector the selector for the DOM element to check the checked state
 */
export const shouldBeChecked = (selector: string) => {
  cy.get(selector).should('be.checked');
};

/**
 * Assert that a checkbox is unchecked
 * @param selector the selector for the DOM element to check the disabled state
 */
export const shouldBeDisabled = (selector: string) => {
  cy.get(selector).should('be.disabled');
};

/**
 * Assert that a selector is enabled
 * @param selector the selector for the DOM element to check the enabled state
 */
export const shouldBeEnabled = (selector: string) => {
  cy.get(selector).should('be.enabled');
};

export const shouldBeSelected = (selector: string) => {
  cy.get(selector).should('be.selected');
};

/**
 * Assert that the input has the expected value
 * @param selector the input selector for the DOM element
 * @param value the expected value of the input
 */
export const checkInputValue = (selector: string, value: string) => {
  cy.get(selector).should('have.value', value);
};
