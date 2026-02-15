/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertFilterControlsWithFilterObject } from '../../../../tasks/alerts_page_filters';
import { getNewRule } from '../../../../objects/rule';
import { FILTER_GROUP_CHANGED_BANNER } from '../../../../screens/common/filter_group';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import {
  resetFilters,
  visitAlertsPageWithCustomFilters,
  waitForAlerts,
  waitForPageFilters,
} from '../../../../tasks/alerts';
import {
  discardFilterGroupControls,
  saveFilterGroupControls,
} from '../../../../tasks/common/filter_group';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const customFilters = [
  {
    field_name: 'kibana.alert.workflow_status',
    title: 'Workflow Status',
  },
  {
    field_name: 'kibana.alert.severity',
    title: 'Severity',
  },
  {
    field_name: 'user.name',
    title: 'User Name',
  },
  {
    field_name: 'process.name',
    title: 'ProcessName',
  },
  {
    field_name: '@timestamp',
    title: '@timestamp',
  },
  {
    field_name: 'agent.type',
    title: 'AgentType',
  },
  {
    field_name: 'kibana.alert.rule.name',
    title: 'Rule Name',
  },
];

describe(`Alerts page filters - changed banner`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule());
    login();
    visitWithTimeRange(ALERTS_URL);
    waitForAlerts();
  });

  it('should populate custom filters & display the changed banner', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();

    assertFilterControlsWithFilterObject(customFilters);

    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
  });

  it('should hide changed banner on saving changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    saveFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('should hide changed banner on discarding changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    discardFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('should hide changed banner on Reset', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    waitForPageFilters();
    resetFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });
});
