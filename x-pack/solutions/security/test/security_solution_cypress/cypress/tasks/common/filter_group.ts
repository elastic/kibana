/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import {
  CONTROL_FRAME_TITLE,
  DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU,
  DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU_BTN,
  FILTER_GROUP_ADD_CONTROL,
  FILTER_GROUP_CONTEXT_DISCARD_CHANGES,
  FILTER_GROUP_CONTEXT_EDIT_CONTROLS,
  FILTER_GROUP_CONTROL_ACTION_DELETE,
  FILTER_GROUP_CONTROL_ACTION_EDIT,
  FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS,
  FILTER_GROUP_EDIT_CONTROLS_PANEL,
  FILTER_GROUP_SAVE_CHANGES,
} from '../../screens/common/filter_group';
import { waitForPageFilters } from '../alerts';

export const openFilterGroupContextMenu = () => {
  recurse(
    () => {
      cy.get(DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU_BTN).scrollIntoView();
      cy.get(DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU_BTN).click();
      return cy.get(DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU).should(Cypress._.noop);
    },
    ($el) => $el.length === 1
  );
};

export const switchFilterGroupControlsToEditMode = () => {
  openFilterGroupContextMenu();
  cy.get(FILTER_GROUP_CONTEXT_EDIT_CONTROLS).click();
};

export const editSingleFilterControl = (idx: number) => {
  cy.get(CONTROL_FRAME_TITLE).eq(idx).realHover();
  cy.get(FILTER_GROUP_CONTROL_ACTION_EDIT(idx)).click();
};

export const saveFilterGroupControls = () => {
  cy.get(FILTER_GROUP_SAVE_CHANGES).click();
  cy.get(FILTER_GROUP_SAVE_CHANGES).should('not.exist');
  waitForPageFilters();
};

export const discardFilterGroupControls = () => {
  openFilterGroupContextMenu();
  cy.get(FILTER_GROUP_CONTEXT_DISCARD_CHANGES).click();
};

export const openAddFilterGroupControlPanel = () => {
  cy.get(FILTER_GROUP_ADD_CONTROL).click();
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('be.visible');
};

export const addNewFilterGroupControlValues = (fieldName: string) => {
  openAddFilterGroupControlPanel();

  const { FIELD_PICKER, FIELD_LABEL, SAVE } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
  cy.get(FIELD_PICKER(fieldName)).click();
  cy.get(FIELD_LABEL).should('have.value', fieldName);
  cy.get(SAVE).click();
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('not.exist');

  waitForPageFilters();
};

export const deleteFilterGroupControl = (idx: number) => {
  cy.get(CONTROL_FRAME_TITLE).eq(idx).realHover();
  cy.get(FILTER_GROUP_CONTROL_ACTION_DELETE(idx)).click();
};

export const editFilterGroupControl = ({ idx, fieldName }: { idx: number; fieldName: string }) => {
  cy.get(CONTROL_FRAME_TITLE).eq(idx).realHover();
  cy.get(FILTER_GROUP_CONTROL_ACTION_EDIT(idx)).click();
  const { FIELD_PICKER, FIELD_LABEL, SAVE } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
  cy.get(FIELD_LABEL).clear();
  cy.get(FIELD_PICKER(fieldName)).click({ force: true });
  cy.get(FIELD_LABEL).should('have.value', fieldName);
  cy.get(SAVE).click();
  cy.get(FILTER_GROUP_EDIT_CONTROLS_PANEL).should('not.exist');
};
