/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataTableModel } from '@kbn/securitysolution-data-table';
import { tag } from '../../../tags';
import { disableExpandableFlyout } from '../../../tasks/api_calls/kibana_advanced_settings';
import {
  ALERT_FLYOUT,
  CELL_TEXT,
  COPY_ALERT_FLYOUT_LINK,
  JSON_TEXT,
  OVERVIEW_RULE,
  TABLE_CONTAINER,
  TABLE_ROWS,
} from '../../../screens/alerts_details';
import { closeAlertFlyout, expandFirstAlert } from '../../../tasks/alerts';
import {
  changeAlertStatusTo,
  filterBy,
  openJsonView,
  openTable,
} from '../../../tasks/alerts_details';
import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login, visit, visitWithoutDateRange } from '../../../tasks/login';
import { getNewRule, getUnmappedRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import { tablePageSelector } from '../../../screens/table_pagination';
import { ALERTS_TABLE_COUNT } from '../../../screens/timeline';
import { ALERT_SUMMARY_SEVERITY_DONUT_CHART } from '../../../screens/alerts';
import { getLocalstorageEntryAsObject } from '../../../helpers/common';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';

describe('Alert details flyout', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  describe('Basic functions', () => {
    before(() => {
      cleanKibana();
      login();
      disableExpandableFlyout();
      createRule(getNewRule());
      visitWithoutDateRange(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
    });

    it('should update the table when status of the alert is updated', () => {
      cy.get(ALERTS_TABLE_COUNT).should('have.text', '2 alerts');
      cy.get(ALERT_SUMMARY_SEVERITY_DONUT_CHART).should('contain.text', '2alerts');
      expandFirstAlert();
      changeAlertStatusTo('acknowledged');
      cy.get(ALERTS_TABLE_COUNT).should('have.text', '1 alert');
      cy.get(ALERT_SUMMARY_SEVERITY_DONUT_CHART).should('contain.text', '1alert');
    });
  });

  describe('With unmapped fields', () => {
    before(() => {
      cleanKibana();
      cy.task('esArchiverLoad', 'unmapped_fields');
      createRule(getUnmappedRule());
    });

    beforeEach(() => {
      login();
      disableExpandableFlyout();
      visitWithoutDateRange(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
    });

    after(() => {
      cy.task('esArchiverUnload', 'unmapped_fields');
    });

    it('should display the unmapped field on the JSON view', () => {
      const expectedUnmappedValue = 'This is the unmapped field';

      openJsonView();

      cy.get(JSON_TEXT).then((x) => {
        const parsed = JSON.parse(x.text());
        expect(parsed.fields.unmapped[0]).to.equal(expectedUnmappedValue);
      });
    });

    it('should displays the unmapped field on the table', () => {
      const expectedUnmappedField = {
        field: 'unmapped',
        text: 'This is the unmapped field',
      };

      openTable();
      cy.get(ALERT_FLYOUT).find(tablePageSelector(6)).click({ force: true });
      cy.get(ALERT_FLYOUT)
        .find(TABLE_ROWS)
        .last()
        .within(() => {
          cy.get(CELL_TEXT).should('contain', expectedUnmappedField.field);
          cy.get(CELL_TEXT).should('contain', expectedUnmappedField.text);
        });
    });

    // This test makes sure that the table does not overflow horizontally
    it('table should not scroll horizontally', () => {
      openTable();

      cy.get(ALERT_FLYOUT)
        .find(TABLE_CONTAINER)
        .within(($tableContainer) => {
          expect($tableContainer[0].scrollLeft).to.equal(0);

          // Due to the introduction of pagination on the table, a slight horizontal overflow has been introduced.
          // scroll ignores the `overflow-x:hidden` attribute and will still scroll the element if there is a hidden overflow
          // Updated the below to < 5 to account for this and keep a test to make sure it doesn't grow
          $tableContainer[0].scroll({ left: 1000 });

          expect($tableContainer[0].scrollLeft).to.be.lessThan(5);
        });
    });
  });

  describe('Url state management', () => {
    before(() => {
      cleanKibana();
      cy.task('esArchiverLoad', 'query_alert');
    });

    beforeEach(() => {
      login();
      disableExpandableFlyout();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
    });

    it('should store the flyout state in the url when it is opened', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      cy.url().should('include', 'eventFlyout=');
    });

    it('should remove the flyout state from the url when it is closed', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      closeAlertFlyout();
      cy.url().should('not.include', 'eventFlyout=');
    });

    it('should open the alert flyout when the page is refreshed', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      cy.reload();
      cy.get(OVERVIEW_RULE).should('be.visible');
      cy.get(OVERVIEW_RULE).should('contain', 'Endpoint Security');
    });

    it('should show the copy link button for the flyout', () => {
      cy.get(COPY_ALERT_FLYOUT_LINK).should('be.visible');
    });

    it('should have the `kibana.alert.url` field set', () => {
      openTable();
      filterBy('kibana.alert.url');
      cy.get('[data-test-subj="formatted-field-kibana.alert.url"]').should(
        'have.text',
        'http://localhost:5601/app/security/alerts/redirect/eabbdefc23da981f2b74ab58b82622a97bb9878caa11bc914e2adfacc94780f1?index=.alerts-security.alerts-default&timestamp=2023-04-27T11:03:57.906Z'
      );
    });
  });

  describe('Localstorage management', () => {
    before(() => {
      cleanKibana();
      cy.task('esArchiverLoad', 'query_alert');
    });

    beforeEach(() => {
      login();
      disableExpandableFlyout();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
    });

    const alertTableKey = 'alerts-page';
    const getFlyoutConfig = (dataTable: { [alertTableKey]: DataTableModel }) =>
      dataTable?.[alertTableKey]?.expandedDetail?.query;

    /**
     * Localstorage is updated after a delay here x-pack/plugins/security_solution/public/common/store/data_table/epic_local_storage.ts
     * We create this config to re-check localStorage 3 times, every 500ms to avoid any potential flakyness from that delay
     */
    const storageCheckRetryConfig = {
      timeout: 1500,
      interval: 500,
    };

    it('should store the flyout state in localstorage', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      const localStorageCheck = () =>
        cy.getAllLocalStorage().then((storage) => {
          const securityDataTable = getLocalstorageEntryAsObject(storage, 'securityDataTable');
          return getFlyoutConfig(securityDataTable)?.panelView === 'eventDetail';
        });

      cy.waitUntil(localStorageCheck, storageCheckRetryConfig);
    });

    it('should remove the flyout details from local storage when closed', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      closeAlertFlyout();
      const localStorageCheck = () =>
        cy.getAllLocalStorage().then((storage) => {
          const securityDataTable = getLocalstorageEntryAsObject(storage, 'securityDataTable');
          return getFlyoutConfig(securityDataTable)?.panelView === undefined;
        });

      cy.waitUntil(localStorageCheck, storageCheckRetryConfig);
    });

    it('should remove the flyout state from localstorage when navigating away without closing the flyout', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      goToRuleDetails();
      const localStorageCheck = () =>
        cy.getAllLocalStorage().then((storage) => {
          const securityDataTable = getLocalstorageEntryAsObject(storage, 'securityDataTable');
          return getFlyoutConfig(securityDataTable)?.panelView === undefined;
        });

      cy.waitUntil(localStorageCheck, storageCheckRetryConfig);
    });

    it('should not reopen the flyout when navigating away from the alerts page and returning to it', () => {
      cy.get(OVERVIEW_RULE).should('be.visible');
      goToRuleDetails();
      visit(ALERTS_URL);
      cy.get(OVERVIEW_RULE).should('not.exist');
    });
  });
});
