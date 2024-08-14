/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_INSIGHT_MISCONFIGURATION,
  HOST_INSIGHT_MISCONFIGURATION_TITLE,
} from '../../../../screens/hosts/flyout_host_panel';
import { expandFirstAlertHostFlyout } from '../../../../tasks/asset_criticality/common';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_URL } from '../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

describe('Alert Host details expandable flyout', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    expandFirstAlertHostFlyout();
  });

  it('should not display Misconfiguration preview under Insights Entities when all Indices is empty', () => {
    cy.log('check if Misconfiguration preview section is not rendered');
    cy.get(HOST_INSIGHT_MISCONFIGURATION).should('not.exist');

    cy.log('check if Misconfiguration preview title is not shown');
    cy.get(HOST_INSIGHT_MISCONFIGURATION_TITLE).should('not.exist');
  });
});
