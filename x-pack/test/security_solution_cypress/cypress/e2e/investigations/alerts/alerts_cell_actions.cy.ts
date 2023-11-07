/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { CELL_COPY_BUTTON, FILTER_BADGE, SHOW_TOP_N_HEADER } from '../../../screens/alerts';
import {
  ALERT_TABLE_FILE_NAME_HEADER,
  ALERT_TABLE_FILE_NAME_VALUES,
  ALERT_TABLE_SEVERITY_HEADER,
  ALERT_TABLE_SEVERITY_VALUES,
  PROVIDER_BADGE,
} from '../../../screens/timeline';

import {
  scrollAlertTableColumnIntoView,
  addAlertPropertyToTimeline,
  filterForAlertProperty,
  showTopNAlertProperty,
  clickExpandActions,
  filterOutAlertProperty,
} from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  fillAddFilterForm,
  fillKqlQueryBar,
  openAddFilterPopover,
} from '../../../tasks/search_bar';
import { openActiveTimeline } from '../../../tasks/timeline';

import { ALERTS_URL } from '../../../urls/navigation';

describe('Alerts cell actions', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    createRule(getNewRule());
  });

  describe('Filter', () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should filter for a non-empty property', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then((severityVal) => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_HEADER);
          filterForAlertProperty(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(FILTER_BADGE).first().should('have.text', `kibana.alert.severity: ${severityVal}`);
        });
    });

    it('should filter for an empty property', () => {
      // add query condition to make sure the field is empty
      fillKqlQueryBar('not file.name: *{enter}');

      scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
      filterForAlertProperty(ALERT_TABLE_FILE_NAME_VALUES, 0);

      cy.get(FILTER_BADGE).first().should('have.text', 'NOT file.name: exists');
    });

    it('should filter out a non-empty property', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then((severityVal) => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_HEADER);
          filterOutAlertProperty(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(FILTER_BADGE)
            .first()
            .should('have.text', `NOT kibana.alert.severity: ${severityVal}`);
        });
    });

    it('should filter out an empty property', () => {
      // add query condition to make sure the field is empty
      fillKqlQueryBar('not file.name: *{enter}');

      scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
      filterOutAlertProperty(ALERT_TABLE_FILE_NAME_VALUES, 0);

      cy.get(FILTER_BADGE).first().should('have.text', 'file.name: exists');
    });
  });

  describe('Add to timeline', () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should add a non-empty property to default timeline', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then((severityVal) => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_VALUES);
          addAlertPropertyToTimeline(ALERT_TABLE_SEVERITY_VALUES, 0);
          openActiveTimeline();
          cy.get(PROVIDER_BADGE)
            .first()
            .should('have.text', `kibana.alert.severity: "${severityVal}"`);
        });
    });

    it('should add an empty property to default timeline', () => {
      // add condition to make sure the field is empty
      openAddFilterPopover();

      fillAddFilterForm({ key: 'file.name', operator: 'does not exist' });
      scrollAlertTableColumnIntoView(ALERT_TABLE_FILE_NAME_HEADER);
      addAlertPropertyToTimeline(ALERT_TABLE_FILE_NAME_VALUES, 0);
      openActiveTimeline();
      cy.get(PROVIDER_BADGE).first().should('have.text', 'NOT file.name exists');
    });
  });

  describe('Show Top N', () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should show top for a property', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then(() => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_VALUES);
          showTopNAlertProperty(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(SHOW_TOP_N_HEADER).first().should('have.text', `Top kibana.alert.severity`);
        });
    });
  });

  describe('Copy to clipboard', () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should copy to clipboard', () => {
      cy.get(ALERT_TABLE_SEVERITY_VALUES)
        .first()
        .invoke('text')
        .then(() => {
          scrollAlertTableColumnIntoView(ALERT_TABLE_SEVERITY_VALUES);
          cy.window().then((win) => {
            cy.stub(win, 'prompt').returns('DISABLED WINDOW PROMPT');
          });
          clickExpandActions(ALERT_TABLE_SEVERITY_VALUES, 0);
          cy.get(CELL_COPY_BUTTON).should('exist');
          // We are not able to test the "copy to clipboard" action execution
          // due to browsers security limitation accessing the clipboard services.
          // We assume external `copy` library works
        });
    });
  });
});
