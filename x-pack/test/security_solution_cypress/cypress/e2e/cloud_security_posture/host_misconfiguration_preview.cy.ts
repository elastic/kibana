/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

import { deleteAlertsAndRules } from '../../tasks/api_calls/common';
import { expandFirstAlertHostFlyout } from '../../tasks/asset_criticality/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { visit } from '../../tasks/navigation';
import { createRule } from '../../tasks/api_calls/rules';
import { getNewRule } from '../../objects/rule';

const HOST_INSIGHT_MISCONFIGURATION = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsMisconfigurationsLeftSection'
);
const HOST_INSIGHT_MISCONFIGURATION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsMisconfigurationsTitleText'
);

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
