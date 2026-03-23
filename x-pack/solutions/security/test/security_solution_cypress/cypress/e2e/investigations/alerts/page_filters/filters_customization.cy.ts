/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';
import {
  CONTROL_FRAME_TITLE,
  CONTROL_FRAMES,
  FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS,
} from '../../../../screens/common/filter_group';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlerts } from '../../../../tasks/alerts';
import {
  addNewFilterGroupControlValues,
  deleteFilterGroupControl,
  discardFilterGroupControls,
  editFilterGroupControl,
  editSingleFilterControl,
  saveFilterGroupControls,
  switchFilterGroupControlsToEditMode,
} from '../../../../tasks/common/filter_group';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe(`Alerts page filters - filters customization`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule());
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlerts();
  });

  it('should be able to customize Controls', () => {
    const fieldName = '@timestamp';
    switchFilterGroupControlsToEditMode();
    cy.log('should be able delete an existing control');
    deleteFilterGroupControl(3);
    cy.get(CONTROL_FRAMES).should((sub) => {
      expect(sub.length).lt(4);
    });

    // ================================================
    cy.log('should be able to add a new control');
    // ================================================

    addNewFilterGroupControlValues(fieldName);
    return;

    discardFilterGroupControls();
    cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', fieldName);

    // ================================================
    cy.log('should be able to edit an existing control');
    // ================================================

    switchFilterGroupControlsToEditMode();
    editFilterGroupControl({ idx: 3, fieldName });
    cy.get(CONTROL_FRAME_TITLE).should('contain.text', fieldName);
    discardFilterGroupControls();
    cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', fieldName);
  });

  it('should not sync to the URL in edit mode but only in view mode', () => {
    cy.url().then((urlString) => {
      switchFilterGroupControlsToEditMode();
      deleteFilterGroupControl(3);
      addNewFilterGroupControlValues('@timestamp');
      cy.url().should('eq', urlString);
      saveFilterGroupControls();
      cy.url().should('not.eq', urlString);
    });
  });

  it('should not show number fields are not visible in field edit panel', () => {
    const idx = 3;
    const { FILTER_FIELD_TYPE, FIELD_TYPES } = FILTER_GROUP_EDIT_CONTROL_PANEL_ITEMS;
    switchFilterGroupControlsToEditMode();
    editSingleFilterControl(idx);
    cy.get(FILTER_FIELD_TYPE).click();
    cy.get(FIELD_TYPES.STRING).should('be.visible');
    cy.get(FIELD_TYPES.BOOLEAN).should('be.visible');
    cy.get(FIELD_TYPES.IP).should('be.visible');
    cy.get(FIELD_TYPES.NUMBER).should('not.exist');
  });
});
