/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { getDataTestSubjectSelector } from '../../helpers/common';

import { deleteAlertsAndRules, rootRequest } from '../../tasks/api_calls/common';
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
const timestamp = Date.now();

// Create a Date object using the timestamp
const date = new Date(timestamp);

// Convert the Date object to ISO 8601 format
const iso8601String = date.toISOString();
const mockFinding = {
  '@timestamp': iso8601String,
  resource: { id: '1234ABCD', name: `kubelet`, sub_type: 'lower case sub type' },
  result: { evaluation: 'passed' },
  rule: {
    name: 'Upper case rule name',
    section: 'Upper case section',
    benchmark: {
      id: 'cis_k8s',
      posture_type: 'kspm',
      name: 'CIS Kubernetes V1.23',
      version: 'v1.0.0',
    },
    type: 'process',
  },
  cluster_id: 'Upper case cluster id',
  data_stream: {
    dataset: 'cloud_security_posture.findings',
  },
};

const createMockFinding = () => {
  return rootRequest({
    method: 'POST',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/${CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN}/_doc`,
    body: mockFinding,
  });
};

const deleteDataStream = () => {
  return rootRequest({
    method: 'DELETE',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/_data_stream/${CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN}`,
  });
};

describe('Alert Host details expandable flyout', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  after(() => {
    deleteDataStream();
  });

  it('should not display Misconfiguration preview under Insights Entities when it does not have Misconfiguration Findings', () => {
    expandFirstAlertHostFlyout();
    cy.log('check if Misconfiguration preview section is not rendered');
    cy.get(HOST_INSIGHT_MISCONFIGURATION).should('not.exist');

    cy.log('check if Misconfiguration preview title is not shown');
    cy.get(HOST_INSIGHT_MISCONFIGURATION_TITLE).should('not.exist');
  });

  it('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', () => {
    createMockFinding();
    expandFirstAlertHostFlyout();
    cy.log('check if Misconfiguration preview section rendered');
    cy.get(HOST_INSIGHT_MISCONFIGURATION).should('exist');

    cy.log('check if Misconfiguration preview title shown');
    cy.get(HOST_INSIGHT_MISCONFIGURATION_TITLE).should('exist');
  });
});
