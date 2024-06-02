/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';

import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects([
    'common',
    'findings',
    'header',
    'settings',
    'security',
    'spaceSelector',
    'cloudPostureDashboard',
    'benchmark',
    'rule',
  ]);
  const security = getService('security');
  const retry = getService('retry');

  const chance = new Chance();
  const cspmResourceId = chance.guid();
  const cspmResourceName = 'gcp-resource';
  const cspmResourceSubType = 'gcp-monitoring';

  // We need to use a dataset for the tests to run
  // We intentionally make some fields start with a capital letter to test that the query bar is case-insensitive/case-sensitive
  const data = [
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: 'failed' },
      orchestrator: {
        cluster: {
          id: '1',
          name: 'Cluster 1',
        },
      },
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
    },
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
      result: { evaluation: 'passed' },
      orchestrator: {
        cluster: {
          id: '1',
          name: 'Cluster 2',
        },
      },
      rule: {
        name: 'lower case rule name',
        section: 'Another upper case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
    },
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: cspmResourceId, name: cspmResourceName, sub_type: cspmResourceSubType },
      result: { evaluation: 'passed' },
      cloud: {
        account: {
          id: '1',
          name: 'Account 1',
        },
      },
      rule: {
        name: 'Another upper case rule name',
        section: 'lower case section',
        benchmark: {
          id: 'cis_gcp',
          posture_type: 'cspm',
          name: 'CIS Google Cloud Platform Foundation',
          version: 'v2.0.0',
        },
        type: 'process',
      },
    },
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: cspmResourceId, name: cspmResourceName, sub_type: cspmResourceSubType },
      result: { evaluation: 'failed' },
      cloud: {
        account: {
          id: '2',
          name: 'Account 2',
        },
      },
      rule: {
        name: 'some lower case rule name',
        section: 'another lower case section',
        benchmark: {
          id: 'cis_gcp',
          posture_type: 'cspm',
          name: 'CIS Google Cloud Platform Foundation',
          version: 'v2.0.0',
        },
        type: 'process',
      },
    },
  ];

  const VALID_CUSTOM_ROLE = {
    name: 'valid_role',
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: ['log-cloud_security_posture.findings-*'],
          privileges: ['read'],
        },
        {
          names: ['logs-cloud_security_posture.findings_latest-*'],
          privileges: ['read'],
        },
        {
          names: ['logs-cloud_security_posture.scores-*'],
          privileges: ['read'],
        },
      ],
      run_as: [],
    },

    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
  };

  const INVALID_CUSTOM_ROLE = {
    name: 'invalid_role',
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: ['log-cloud_security_posture.findings-*'],
          privileges: ['read'],
        },
        {
          names: ['logs-cloud_security_posture.scores-*'],
          privileges: ['read'],
        },
      ],
      run_as: [],
    },

    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
  };

  const VALID_USER = {
    name: 'csp_valid_user',
    password: 'test123',
  };
  const INVALID_USER = {
    name: 'csp_invalid_user',
    password: 'test123',
  };

  const navigateToHomePage = async () => {
    await pageObjects.common.navigateToUrl('app');
    await pageObjects.header.waitUntilLoadingHasFinished();
  };

  describe('Custom Role Access', function () {
    let findings: typeof pageObjects.findings;
    let latestFindingsTable: typeof findings.latestFindingsTable;
    let cspDashboard: typeof pageObjects.cloudPostureDashboard;
    let dashboard: typeof pageObjects.cloudPostureDashboard.dashboard;
    let rule: typeof pageObjects.rule;
    let benchmark: typeof pageObjects.benchmark;

    before(async () => {
      findings = pageObjects.findings;
      latestFindingsTable = findings.latestFindingsTable;
      cspDashboard = pageObjects.cloudPostureDashboard;
      dashboard = pageObjects.cloudPostureDashboard.dashboard;
      benchmark = pageObjects.benchmark;
      rule = pageObjects.rule;

      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });

      await findings.waitForPluginInitialized();

      // Prepare mocked findings
      await findings.index.remove();
      await findings.index.add(data);
    });

    after(async () => {
      await findings.index.remove();
    });

    describe('Access with custom roles', async () => {
      before(async () => {
        await security.role.create(VALID_CUSTOM_ROLE.name, {
          elasticsearch: VALID_CUSTOM_ROLE.elasticsearch,
          kibana: VALID_CUSTOM_ROLE.kibana,
        });
        await security.user.create(VALID_USER.name, {
          password: VALID_USER.password,
          roles: [VALID_CUSTOM_ROLE.name],
        });
        await navigateToHomePage;
        await pageObjects.security.forceLogout();
        await pageObjects.security.login(VALID_USER.name, VALID_USER.password, {
          expectSpaceSelector: false,
        });
      });

      it('Access to the dashboard page', async () => {
        await cspDashboard.navigateToComplianceDashboardPage();
        await retry.waitFor(
          'Cloud posture integration dashboard to be displayed',
          async () => !!dashboard.getIntegrationDashboardContainer()
        );
        const scoreElement = await dashboard.getKubernetesComplianceScore();

        expect((await scoreElement.getVisibleText()) === '50%').to.be(true); // based on the ingeated findings
      });

      it('Access to the findings page', async () => {
        await findings.navigateToLatestFindingsPage();
        pageObjects.header.waitUntilLoadingHasFinished();

        expect(await latestFindingsTable.getRowsCount()).to.be.greaterThan(0);
      });

      it('Access to the benchmark page', async () => {
        await benchmark.navigateToBenchnmarkPage();

        expect(await benchmark.benchmarkPage.doesBenchmarkTableExists());
      });

      it('Access to the rules page', async () => {
        await rule.navigateToRulePage('cis_k8s', '1.0.1');

        expect(await rule.rulePage.toggleBulkActionButton());
      });
    });

    describe('Custom Roles Access - Valid Role', async () => {
      before(async () => {
        await security.role.create(INVALID_CUSTOM_ROLE.name, {
          elasticsearch: INVALID_CUSTOM_ROLE.elasticsearch,
          kibana: INVALID_CUSTOM_ROLE.kibana,
        });
        await security.user.create(INVALID_USER.name, {
          password: INVALID_USER.password,
          roles: [INVALID_CUSTOM_ROLE.name],
        });

        await navigateToHomePage;
        await pageObjects.security.forceLogout();
        await pageObjects.security.login(INVALID_USER.name, INVALID_USER.password, {
          expectSpaceSelector: false,
        });
      });

      it('Access findings page', async () => {
        await findings.navigateToLatestFindingsPage();

        pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.getUnprivilegedPrompt());
      });

      // Blocked by https://github.com/elastic/kibana/issues/184621
      // it('Fail to access the dashboard page', async () => {

      // });

      // it('Access to the benchmark page', async () => {

      // });
    });
  });
}
