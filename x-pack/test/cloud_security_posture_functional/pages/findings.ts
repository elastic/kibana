/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import { CspBenchmarkRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects(['common', 'cspSecurity', 'findings', 'header']);
  const chance = new Chance();
  const timeFiveHoursAgo = (Date.now() - 18000000).toString();

  // We need to use a dataset for the tests to run
  // We intentionally make some fields start with a capital letter to test that the query bar is case-insensitive/case-sensitive
  const data = [
    {
      '@timestamp': timeFiveHoursAgo,
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
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
    },
    {
      '@timestamp': timeFiveHoursAgo,
      resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
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
      cluster_id: 'Another Upper case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
    {
      '@timestamp': timeFiveHoursAgo,
      resource: { id: chance.guid(), name: `process`, sub_type: 'another lower case type' },
      result: { evaluation: 'passed' },
      rule: {
        name: 'Another upper case rule name',
        section: 'lower case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'lower case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
    {
      '@timestamp': timeFiveHoursAgo,
      resource: { id: chance.guid(), name: `process`, sub_type: 'Upper case type again' },
      result: { evaluation: 'failed' },
      rule: {
        name: 'some lower case rule name',
        section: 'another lower case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'another lower case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
  ];

  const getCspBenchmarkRules = async (benchmarkId: string): Promise<CspBenchmarkRule[]> => {
    const cspBenchmarkRules = await kibanaServer.savedObjects.find<CspBenchmarkRule>({
      type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    });
    const requestedBenchmarkRules = cspBenchmarkRules.saved_objects.filter(
      (cspBenchmarkRule) => cspBenchmarkRule.attributes.metadata.benchmark.id === benchmarkId
    );
    expect(requestedBenchmarkRules.length).greaterThan(0);

    return requestedBenchmarkRules.map((item) => item.attributes);
  };

  describe('Findings Page - DataTable', function () {
    this.tags(['cloud_security_posture_findings']);
    let findings: typeof pageObjects.findings;
    let latestFindingsTable: typeof findings.latestFindingsTable;
    let distributionBar: typeof findings.distributionBar;
    let cspSecurity = pageObjects.cspSecurity;

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });

      findings = pageObjects.findings;
      latestFindingsTable = findings.latestFindingsTable;
      distributionBar = findings.distributionBar;
      cspSecurity = pageObjects.cspSecurity;

      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await findings.waitForPluginInitialized();

      // Prepare mocked findings
      await findings.index.remove();
      await findings.index.add(data);

      await findings.navigateToLatestFindingsPage();
      await retry.waitFor(
        'Findings table to be loaded',
        async () => (await latestFindingsTable.getRowsCount()) === data.length
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    afterEach(async () => {
      await findings.index.remove();
    });

    describe('Table Sort', () => {
      type SortingMethod = (a: string, b: string) => number;
      type SortDirection = 'asc' | 'desc';
      // Sort by lexical order will sort by the first character of the string (case-sensitive)
      const compareStringByLexicographicOrder = (a: string, b: string) => {
        return a > b ? 1 : b > a ? -1 : 0;
      };
      const sortByAlphabeticalOrder = (a: string, b: string) => {
        return a.localeCompare(b);
      };

      it('sorts by a column, should be case sensitive/insensitive depending on the column', async () => {
        type TestCase = [string, SortDirection, SortingMethod];
        const testCases: TestCase[] = [
          ['rule.section', 'asc', sortByAlphabeticalOrder],
          ['rule.section', 'desc', sortByAlphabeticalOrder],
          ['resource.id', 'asc', compareStringByLexicographicOrder],
          ['resource.id', 'desc', compareStringByLexicographicOrder],
          ['resource.name', 'asc', sortByAlphabeticalOrder],
          ['resource.name', 'desc', sortByAlphabeticalOrder],
          ['resource.sub_type', 'asc', sortByAlphabeticalOrder],
          ['resource.sub_type', 'desc', sortByAlphabeticalOrder],
        ];
        for (const [columnName, dir, sortingMethod] of testCases) {
          await latestFindingsTable.toggleColumnSort(columnName, dir);
          /* This sleep or delay is added to allow some time for the column to settle down before we get the value and to prevent the test from getting the wrong value*/
          await pageObjects.header.waitUntilLoadingHasFinished();
          const values = (await latestFindingsTable.getColumnValues(columnName)).filter(Boolean);
          expect(values).to.not.be.empty();
          const sorted = values
            .slice()
            .sort((a, b) => (dir === 'asc' ? sortingMethod(a, b) : sortingMethod(b, a)));
          values.forEach((value, i) => {
            expect(value).to.be.eql(
              sorted[i],
              `Row number ${i + 1} missmatch, expected value: ${value}. Instead got: ${sorted[i]}`
            );
          });
        }
      });
    });

    describe('Findings - Fields selector', () => {
      const CSP_FIELDS_SELECTOR_MODAL = 'cloudSecurityFieldsSelectorModal';
      const CSP_FIELDS_SELECTOR_OPEN_BUTTON = 'cloudSecurityFieldsSelectorOpenButton';
      const CSP_FIELDS_SELECTOR_RESET_BUTTON = 'cloudSecurityFieldsSelectorResetButton';
      const CSP_FIELDS_SELECTOR_CLOSE_BUTTON = 'cloudSecurityFieldsSelectorCloseButton';

      it('Add fields to the Findings DataTable', async () => {
        const fieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_OPEN_BUTTON);
        await fieldsButton.click();
        await testSubjects.existOrFail(CSP_FIELDS_SELECTOR_MODAL);

        const agentIdCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.id'
        );
        await agentIdCheckbox.click();

        const agentNameCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.name'
        );
        await agentNameCheckbox.click();

        await testSubjects.existOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.existOrFail('dataGridHeaderCell-agent.name');

        const closeFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_CLOSE_BUTTON);
        await closeFieldsButton.click();
        await testSubjects.missingOrFail(CSP_FIELDS_SELECTOR_MODAL);
      });

      it('Remove fields from the Findings DataTable', async () => {
        const fieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_OPEN_BUTTON);
        await fieldsButton.click();

        const agentIdCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.id'
        );
        await agentIdCheckbox.click();

        const agentNameCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.name'
        );
        await agentNameCheckbox.click();

        await testSubjects.missingOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.missingOrFail('dataGridHeaderCell-agent.name');

        const closeFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_CLOSE_BUTTON);
        await closeFieldsButton.click();
        await testSubjects.missingOrFail(CSP_FIELDS_SELECTOR_MODAL);
      });
      it('Reset fields to default', async () => {
        const fieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_OPEN_BUTTON);
        await fieldsButton.click();

        const agentIdCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.id'
        );
        await agentIdCheckbox.click();

        const agentNameCheckbox = await testSubjects.find(
          'cloud-security-fields-selector-item-agent.name'
        );
        await agentNameCheckbox.click();

        await testSubjects.existOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.existOrFail('dataGridHeaderCell-agent.name');

        const resetFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_RESET_BUTTON);
        await resetFieldsButton.click();

        await testSubjects.missingOrFail('dataGridHeaderCell-agent.id');
        await testSubjects.missingOrFail('dataGridHeaderCell-agent.name');

        const closeFieldsButton = await testSubjects.find(CSP_FIELDS_SELECTOR_CLOSE_BUTTON);
        await closeFieldsButton.click();
        await testSubjects.missingOrFail(CSP_FIELDS_SELECTOR_MODAL);
      });
    });

    describe('Findings Page - support muting rules', () => {
      it(`verify only enabled rules appears`, async () => {
        const passedFindings = data.filter(({ result }) => result.evaluation === 'passed');
        const passedFindingsCount = passedFindings.length;

        const rule = (await getCspBenchmarkRules('cis_k8s'))[0];
        const modifiedFinding = {
          ...passedFindings[0],
          rule: {
            name: 'Upper case rule name1',
            id: rule.metadata.id,
            section: 'Upper case section1',
            benchmark: {
              id: rule.metadata.benchmark.id,
              posture_type: rule.metadata.benchmark.posture_type,
              name: rule.metadata.benchmark.name,
              version: rule.metadata.benchmark.version,
              rule_number: rule.metadata.benchmark.rule_number,
            },
            type: 'process',
          },
        };

        await findings.index.add([modifiedFinding]);

        await findings.navigateToLatestFindingsPage();
        await retry.waitFor(
          'Findings table to be loaded',
          async () => (await latestFindingsTable.getRowsCount()) === data.length + 1
        );
        await pageObjects.header.waitUntilLoadingHasFinished();

        await distributionBar.filterBy('passed');

        expect(await latestFindingsTable.getFindingsCount('passed')).to.eql(
          passedFindingsCount + 1
        );

        await supertest
          .post(`/internal/cloud_security_posture/rules/_bulk_action`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .send({
            action: 'mute',
            rules: [
              {
                benchmark_id: modifiedFinding.rule.benchmark.id,
                benchmark_version: modifiedFinding.rule.benchmark.version,
                rule_number: modifiedFinding.rule.benchmark.rule_number || '',
                rule_id: modifiedFinding.rule.id,
              },
            ],
          })
          .expect(200);

        await findings.navigateToLatestFindingsPage();
        await retry.waitFor(
          'Findings table to be loaded',
          async () => (await latestFindingsTable.getRowsCount()) === data.length
        );
        await pageObjects.header.waitUntilLoadingHasFinished();

        await distributionBar.filterBy('passed');

        expect(await latestFindingsTable.getFindingsCount('passed')).to.eql(passedFindingsCount);
      });
    });

    describe('Access with custom roles', async () => {
      this.afterEach(async () => {
        // force logout to prevent the next test from failing
        await cspSecurity.logout();
      });

      it('Access with valid user role', async () => {
        await cspSecurity.logout();
        await cspSecurity.login('csp_read_user');
        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await latestFindingsTable.getRowsCount()).to.be.greaterThan(0);
      });

      it('Access with invalid user role', async () => {
        await cspSecurity.logout();
        await cspSecurity.login('csp_missing_latest_findings_access_user');

        await findings.navigateToLatestFindingsPage();

        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.getUnprivilegedPrompt());
      });
    });
  });
}
