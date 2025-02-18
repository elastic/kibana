/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { createRule } from '../../tasks/api_calls/rules';
import { getNewRule } from '../../objects/rule';
import { getDataTestSubjectSelector } from '../../helpers/common';

import { rootRequest, deleteAlertsAndRules } from '../../tasks/api_calls/common';
import { expandFirstAlertHostFlyout } from '../../tasks/asset_criticality/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { login } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { visit } from '../../tasks/navigation';

const CSP_INSIGHT_VULNERABILITIES_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsVulnerabilitiesTitleLink'
);

const CSP_INSIGHT_VULNERABILITIES_TABLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutVulnerabilitiesFindingsTable'
);

const timestamp = Date.now();

const date = new Date(timestamp);

const iso8601String = date.toISOString();

const getMockVulnerability = (isNameMatchesAlert: boolean) => {
  return {
    '@timestamp': iso8601String,
    resource: { name: '634yfsdg2.dkr.ecr.eu-central-1.amazon.stage', id: 'ami_12328' },
    agent: {
      name: 'ip-172-31-33-74',
      type: 'cloudbeat',
      version: '8.8.0',
      ephemeral_id: '49f19e6a-94e9-4f2b-81e3-2f3794a74068',
      id: 'd0313a94-c168-4d95-b1f0-97a388dac29a',
    },
    cloud: {
      availability_zone: 'eu-west-1c',
      service: { name: 'EC2' },
      account: { id: '704479110758' },
      image: { id: 'ami-02dc8dbcc971f2c74' },
      provider: 'aws',
      instance: { id: 'i-0fb7759c6e5d400cf' },
      machine: { type: 'c6g.medium' },
      region: 'eu-west-1',
    },
    package: { fixed_version: '0.4.0', version: 'v0.2.0', name: 'golang.org/x/net' },
    vulnerability: {
      published_date: '2022-08-10T00:00:00.000Z',
      data_source: {
        ID: 'go-vulndb',
        Name: 'The Go Vulnerability Database',
        URL: 'https://github.com/golang/vulndb',
      },
      enumeration: 'CVE',
      description:
        'An attacker can cause excessive memory growth in a Go server accepting HTTP/2 requests. HTTP/2 server connections contain a cache of HTTP header keys sent by the client. While the total number of entries in this cache is capped, an attacker sending very large keys can cause the server to allocate approximately 64 MiB per open connection.',
      title:
        'golang: net/http: An attacker can cause excessive memory growth in a Go server accepting HTTP/2 requests',
      reference: 'https://avd.aquasec.com/nvd/cve-2022-41717',
      severity: 'MEDIUM',
      cvss: {
        nvd: { V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L', V3Score: 5.3 },
        redhat: { V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L', V3Score: 5.3 },
        ghsa: { V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L', V3Score: 5.3 },
      },
      scanner: { vendor: 'Trivy' },
      score: { base: 5.3, version: '3.0' },
      cwe: ['CWE-770'],
      id: 'CVE-2022-41717',
      classification: 'CVSS',
    },
    cloudbeat: {
      commit_sha: 'b5c4b728f0a9268e7f2d195c00dad0320c8a74e6',
      commit_time: '2023-03-30T07:47:06Z',
      version: '8.8.0',
    },
    event: {
      category: ['vulnerability'],
      created: '2023-03-30T10:27:35.013537768Z',
      id: '5cfbcbe5-7f90-47b8-b1d4-7f79313b2a6d',
      kind: 'state',
      sequence: 1680172055,
      outcome: 'success',
      type: ['info'],
    },
    ecs: { version: '8.0.0' },
    host: {
      os: {
        kernel: '5.15.0-1028-aws',
        codename: 'jammy',
        type: 'linux',
        platform: 'ubuntu',
        version: '22.04.1 LTS (Jammy Jellyfish)',
        family: 'debian',
        name: 'Ubuntu',
      },
      id: 'ec2644f440799ed0cf8aa595a9a105cc',
      containerized: false,
      name: isNameMatchesAlert ? 'siem-kibana' : 'not-siem-kibana',
      ip: ['172.31.33.74', 'fe80::85d:f0ff:fe91:c01b'],
      mac: ['0A-5D-F0-91-C0-1B'],
      hostname: 'ip-172-31-33-74',
      architecture: 'aarch64',
    },
    data_stream: {
      dataset: 'cloud_security_posture.vulnerabilities',
    },
  };
};

const createMockVulnerability = (isNameMatchesAlert: boolean) => {
  return rootRequest({
    method: 'POST',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}/_doc`,
    body: getMockVulnerability(isNameMatchesAlert),
  });
};

const deleteDataStream = () => {
  return rootRequest({
    method: 'DELETE',
    url: `${Cypress.env(
      'ELASTICSEARCH_URL'
    )}/_data_stream/${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}`,
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

  context('No Vulnerabilities Findings', () => {
    it('should not display Vulnerabilities preview under Insights Entities when it does not have Vulnerabilities Findings', () => {
      expandFirstAlertHostFlyout();

      cy.log('check if Vulnerabilities preview title is not shown');
      cy.get(CSP_INSIGHT_VULNERABILITIES_TITLE).should('not.exist');
    });
  });

  context(
    'Host name - Has Vulnerabilities findings but with different host name than the alerts',
    () => {
      beforeEach(() => {
        createMockVulnerability(false);
        cy.reload();
        expandFirstAlertHostFlyout();
      });

      afterEach(() => {
        /* Deleting data stream even though we don't create it because data stream is automatically created when Cloud security API is used  */
        deleteDataStream();
      });

      it('should display Vulnerabilities preview under Insights Entities when it has Vulnerabilities Findings', () => {
        expandFirstAlertHostFlyout();

        cy.log('check if Vulnerabilities preview title is not shown');
        cy.get(CSP_INSIGHT_VULNERABILITIES_TITLE).should('not.exist');
      });
    }
  );

  context('Host name - Has Vulnerabilities findings', () => {
    beforeEach(() => {
      createMockVulnerability(true);
      cy.reload();
      expandFirstAlertHostFlyout();
    });

    afterEach(() => {
      deleteDataStream();
    });

    it('should display Vulnerabilities preview under Insights Entities when it has Vulnerabilities Findings', () => {
      cy.log('check if Vulnerabilities preview title shown');
      cy.get(CSP_INSIGHT_VULNERABILITIES_TITLE).should('be.visible');
    });

    it('should display insight tabs and findings table upon clicking on misconfiguration accordion', () => {
      cy.get(CSP_INSIGHT_VULNERABILITIES_TITLE).click();
      cy.get(CSP_INSIGHT_VULNERABILITIES_TABLE).should('be.visible');
    });
  });
});
