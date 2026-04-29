/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';
import {
  CONTROL_POPOVER,
  OPTION_SELECTABLE,
  OPTION_SELECTABLE_COUNT,
} from '../../../../screens/common/filter_group';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import {
  togglePageFilterPopover,
  waitForAlerts,
  waitForPageFilters,
} from '../../../../tasks/alerts';
import { ALERTS_PAGE_KQL_BAR, EMPTY_ALERT_TABLE } from '../../../../screens/alerts';
import { kqlSearch, refreshPage } from '../../../../tasks/security_header';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { setEndDate, setStartDate } from '../../../../tasks/date_picker';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe(`Alerts page filters - kqlbar`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule());
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlerts();
  });

  it('should recover from invalid kql query result', () => {
    // do an invalid search
    kqlSearch('\\', ALERTS_PAGE_KQL_BAR);
    refreshPage();
    waitForPageFilters();
    cy.get(TOASTER).should('contain.text', 'KQLSyntaxError');
    togglePageFilterPopover(0);
    cy.get(OPTION_SELECTABLE(0, 'open')).should('be.visible');
    cy.get(OPTION_SELECTABLE(0, 'open')).should('contain.text', 'open');
    cy.get(OPTION_SELECTABLE(0, 'open')).get(OPTION_SELECTABLE_COUNT).should('have.text', 1);
  });

  it('should take kqlQuery into account', () => {
    kqlSearch('kibana.alert.workflow_status: "nothing"', ALERTS_PAGE_KQL_BAR);
    refreshPage();
    waitForPageFilters();
    togglePageFilterPopover(0);
    cy.get(CONTROL_POPOVER(0)).should('contain.text', 'No options found');
    cy.get(EMPTY_ALERT_TABLE).should('be.visible');
  });

  it('should take timeRange into account', () => {
    const dateRangeWithZeroAlerts = ['Jan 1, 2002 @ 00:00:00.000', 'Jan 1, 2002 @ 00:00:00.000'];
    setStartDate(dateRangeWithZeroAlerts[0]);
    setEndDate(dateRangeWithZeroAlerts[1]);

    refreshPage();
    waitForPageFilters();
    togglePageFilterPopover(0);
    cy.get(CONTROL_POPOVER(0)).should('contain.text', 'No options found');
    cy.get(EMPTY_ALERT_TABLE).should('be.visible');
  });
});
