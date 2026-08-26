/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_CASES_NAME, ALL_CASES_CREATE_NEW_CASE_BTN } from '../screens/all_cases';

const CASES_PAGE_LAYOUT = '[data-test-subj="casesPageLayout"]';
// Owner-prefixed key used by the cases list to persist its view mode (see `useCasesLocalStorage`).
const SECURITY_CASES_VIEW_MODE_LS_KEY = 'securitySolution.cases.list.viewMode';

export const goToCreateNewCase = () => {
  cy.get(ALL_CASES_CREATE_NEW_CASE_BTN, { timeout: 60000 }).click();
};

export const goToCaseDetails = () => {
  cy.get(ALL_CASES_NAME).click();
};

/**
 * Runs `whenRedesign` when the redesign (compact) cases layout is active, otherwise `whenLegacy`.
 * The design is detected at runtime from the `data-layout-variant` marker on `casesPageLayout`, so
 * the same spec passes whether the `casesRedesign` flags are on or off.
 */
export const withCasesRedesign = ({
  whenLegacy,
  whenRedesign,
}: {
  whenLegacy: () => void;
  whenRedesign: () => void;
}) => {
  cy.get(CASES_PAGE_LAYOUT)
    .invoke('attr', 'data-layout-variant')
    .then((variant) => (variant === 'compact' ? whenRedesign() : whenLegacy()));
};

/**
 * Forces the cases list into the table view and reloads. The redesign defaults to a card list; its
 * table view reuses the legacy table selectors, so this keeps table-column assertions working when
 * the `casesRedesign.list` flag is on. Harmless in the legacy design (the key is ignored).
 */
export const forceCasesTableView = () => {
  cy.window().then((win) => {
    win.localStorage.setItem(SECURITY_CASES_VIEW_MODE_LS_KEY, JSON.stringify('table'));
  });
  cy.reload();
};
