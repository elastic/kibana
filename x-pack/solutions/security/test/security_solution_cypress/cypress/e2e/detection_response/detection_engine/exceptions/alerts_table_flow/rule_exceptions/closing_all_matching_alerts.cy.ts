/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionLists,
  linkRulesToExceptionList,
} from '../../../../../../tasks/api_calls/exceptions';
import { waitForAlertsToPopulate } from '../../../../../../tasks/create_new_rule';
import {
  addExceptionFromFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  waitForAlerts,
} from '../../../../../../tasks/alerts';
import { deleteAlertsAndRules, postDataView } from '../../../../../../tasks/api_calls/common';
import { login } from '../../../../../../tasks/login';
import {
  clickDisableRuleSwitch,
  visitRuleDetailsPage,
  openEditException,
  goToExceptionsTab,
  goToAlertsTab,
} from '../../../../../../tasks/rule_details';
import { createRule } from '../../../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../../../objects/rule';
import { getExceptionList } from '../../../../../../objects/exception';
import { LOADING_INDICATOR } from '../../../../../../screens/security_header';
import { ALERTS_COUNT, ALERT_EMBEDDABLE_EMPTY_PROMPT } from '../../../../../../screens/alerts';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryOperatorValue,
  addExceptionEntryFieldValueValue,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitEditedExceptionItem,
  submitNewExceptionItem,
} from '../../../../../../tasks/exceptions';

const EXCEPTION_LIST_NAME = 'My test list';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_NAME,
  list_id: 'exception_list_1',
});

describe('Close matching Alerts ', { tags: ['@ess', '@serverless'] }, () => {
  const ITEM_NAME = 'Sample Exception Item';

  beforeEach(() => {
    deleteAlertsAndRules();
    deleteExceptionLists();

    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });

    login();
    postDataView('auditbeat-exceptions-*');
    createRule(
      getNewRule({
        query: 'agent.name:*',
        data_view_id: 'auditbeat-exceptions-*',
        interval: '1m',
        rule_id: 'rule_testing',
      })
    ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'alerts' }));

    waitForAlertsToPopulate();
    // Disables enabled rule
    clickDisableRuleSwitch();
    cy.get(LOADING_INDICATOR).should('not.exist');
  });
  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
    deleteAlertsAndRules();
    deleteExceptionLists();
  });

  it('Should create a Rule exception item from alert actions overflow menu and close all matching alerts', () => {
    addExceptionFromFirstAlert();

    addExceptionEntryFieldValue('agent.name', 0);
    addExceptionEntryOperatorValue('is', 0);
    addExceptionEntryFieldValueValue('foo', 0);

    addExceptionFlyoutItemName(ITEM_NAME);
    selectBulkCloseAlerts();
    submitNewExceptionItem();

    // Instead of immediately checking if the Opened Alert has moved to the closed tab,
    // use the waitForAlerts method to create a buffer, allowing the alerts some time to
    // be moved to the Closed Alert tab.
    waitForAlerts();

    // Closed alert should appear in table
    goToClosedAlertsOnRuleDetailsPage();
    cy.get(LOADING_INDICATOR).should('not.exist');
    cy.get(ALERTS_COUNT).should('contain', '1');
  });

  it('Should close all alerts from if several rules has shared exception list', () => {
    cy.get(ALERTS_COUNT).should('contain', '3');

    let exceptionListId = '';
    createExceptionList(getExceptionList1(), getExceptionList1().list_id)
      .then((response) => {
        exceptionListId = response.body.id;
        createExceptionListItem(getExceptionList1().list_id, {
          item_id: '123',
          entries: [
            {
              field: 'user.name',
              operator: 'included',
              type: 'match_any',
              value: ['alice'],
            },
          ],
        });
      })
      .then((response) => {
        return createRule(
          getNewRule({
            exceptions_list: [
              {
                id: response.body.id,
                list_id: getExceptionList1().list_id,
                type: getExceptionList1().type,
                namespace_type: getExceptionList1().namespace_type,
              },
            ],
          })
        );
      })
      .then(() =>
        linkRulesToExceptionList('rule_testing', {
          id: exceptionListId,
          listId: getExceptionList1().list_id,
        })
      );

    goToExceptionsTab();
    cy.reload();
    openEditException();
    selectBulkCloseAlerts();
    submitEditedExceptionItem();
    goToAlertsTab();

    cy.get(ALERTS_COUNT).should('not.exist');
    cy.get(ALERT_EMBEDDABLE_EMPTY_PROMPT).should('exist');
  });
});
