/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELD_UPGRADE_WRAPPER,
  PER_FIELD_ACCEPT_BUTTON,
  PER_FIELD_CANCEL_BUTTON,
  PER_FIELD_EDIT_BUTTON,
  PER_FIELD_SAVE_BUTTON,
} from '../../screens/alerts_detection_rules';

export function toggleFieldAccordion(fieldName: string): void {
  cy.get(`${FIELD_UPGRADE_WRAPPER(fieldName)} .euiAccordion__arrow`).click();
}

export function switchFieldToEditMode(fieldName: string): void {
  cy.get(`${FIELD_UPGRADE_WRAPPER(fieldName)} ${PER_FIELD_EDIT_BUTTON}`).click();
}

export function acceptFieldValue(fieldName: string): void {
  cy.get(`${FIELD_UPGRADE_WRAPPER(fieldName)} ${PER_FIELD_ACCEPT_BUTTON}`).click();
}

export function saveFieldValue(fieldName: string): void {
  cy.get(`${FIELD_UPGRADE_WRAPPER(fieldName)} ${PER_FIELD_SAVE_BUTTON}`).click();
}

export function cancelFieldValue(fieldName: string): void {
  cy.get(`${FIELD_UPGRADE_WRAPPER(fieldName)} ${PER_FIELD_CANCEL_BUTTON}`).click();
}

export function typeRuleName(ruleName: string): void {
  cy.get(`${FIELD_UPGRADE_WRAPPER('name')} [data-test-subj="input"]`).clear();
  cy.get(`${FIELD_UPGRADE_WRAPPER('name')} [data-test-subj="input"]`).type(ruleName);
}
