/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { createRule } from '../../tasks/api_calls/rules';
import { getNewRule } from '../../objects/rule';
import { getDataTestSubjectSelector } from '../../helpers/common';

import { rootRequest, deleteAlertsAndRules } from '../../tasks/api_calls/common';
import {
  expandFirstAlertHostFlyout,
  expandFirstAlertUserFlyout,
} from '../../tasks/asset_criticality/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { visit } from '../../tasks/navigation';

const CSP_INSIGHT_MISCONFIGURATION_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsMisconfigurationsTitleLink'
);

const CSP_INSIGHT_TAB_TITLE = getDataTestSubjectSelector('securitySolutionFlyoutInsightInputsTab');
const CSP_INSIGHT_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutMisconfigurationFindingsTable'
);

const clickMisconfigurationTitle = () => {
  cy.get(CSP_INSIGHT_MISCONFIGURATION_TITLE).click();
};

const timestamp = Date.now();

const date = new Date(timestamp);

const iso8601String = date.toISOString();

const mockFindingHostName = (matches: boolean) => {
  return {
    '@timestamp': iso8601String,
    host: { name: matches ? 'siem-kibana' : 'not-siem-kibana' },
    resource: {
      id: '1234ABCD',
      name: 'kubelet',
      sub_type: 'lower case sub type',
    },
    result: { evaluation: matches ? 'passed' : 'failed' },
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
};

const mockFindingUserName = (matches: boolean) => {
  return {
    '@timestamp': iso8601String,
    user: { name: matches ? 'test' : 'not-test' },
    resource: {
      id: '1234ABCD',
      name: 'kubelet',
      sub_type: 'lower case sub type',
    },
    result: { evaluation: matches ? 'passed' : 'failed' },
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
};

const createMockFinding = (isNameMatches: boolean, findingType: 'host.name' | 'user.name') => {
  return rootRequest({
    method: 'POST',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/${CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN}/_doc`,
    body:
      findingType === 'host.name'
        ? mockFindingHostName(isNameMatches)
        : mockFindingUserName(isNameMatches),
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

  context('Host name - Has misconfiguration findings', () => {
    beforeEach(() => {
      createMockFinding(true, 'host.name');
      cy.reload();
      expandFirstAlertHostFlyout();
    });

    afterEach(() => {
      /* Deleting data stream even though we don't create it because data stream is automatically created when Cloud security API is used  */
      deleteDataStream();
    });

    it('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', () => {
      cy.log('check if Misconfiguration preview title shown');
      cy.get(CSP_INSIGHT_MISCONFIGURATION_TITLE).should('be.visible');
    });

    it('should display insight tabs and findings table upon clicking on misconfiguration accordion', () => {
      clickMisconfigurationTitle();
      cy.get(CSP_INSIGHT_TAB_TITLE).should('be.visible');
      cy.get(CSP_INSIGHT_TABLE).should('be.visible');
    });
  });

  context(
    'Host name - Has misconfiguration findings but host name is not the same as alert host name',
    () => {
      beforeEach(() => {
        createMockFinding(false, 'host.name');
        cy.reload();
        expandFirstAlertHostFlyout();
      });

      afterEach(() => {
        deleteDataStream();
      });

      it('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', () => {
        expandFirstAlertHostFlyout();

        cy.log('check if Misconfiguration preview title is not shown');
        cy.get(CSP_INSIGHT_MISCONFIGURATION_TITLE).should('not.exist');
      });
    }
  );

  context('User name - Has misconfiguration findings', () => {
    beforeEach(() => {
      createMockFinding(true, 'user.name');
      cy.reload();
      expandFirstAlertUserFlyout();
    });

    afterEach(() => {
      deleteDataStream();
    });

    it('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', () => {
      cy.log('check if Misconfiguration preview title shown');
      cy.get(CSP_INSIGHT_MISCONFIGURATION_TITLE).should('be.visible');
    });

    it('should display insight tabs and findings table upon clicking on misconfiguration accordion', () => {
      clickMisconfigurationTitle();
      cy.get(CSP_INSIGHT_TAB_TITLE).should('be.visible');
      cy.get(CSP_INSIGHT_TABLE).should('be.visible');
    });
  });

  context(
    'User name - Has misconfiguration findings but host name is not the same as alert host name',
    () => {
      beforeEach(() => {
        createMockFinding(false, 'user.name');
        cy.reload();
        expandFirstAlertHostFlyout();
      });

      afterEach(() => {
        deleteDataStream();
      });

      it('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', () => {
        expandFirstAlertUserFlyout();

        cy.log('check if Misconfiguration preview title is not shown');
        cy.get(CSP_INSIGHT_MISCONFIGURATION_TITLE).should('not.exist');
      });
    }
  );
});
