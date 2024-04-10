/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import { asyncForEach } from '@kbn/std';
import { CspBenchmarkRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
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

  const ruleName1 = data[0].rule.name;

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

  describe('Findings Page - Grouping', function () {
    this.tags(['cloud_security_posture_findings_grouping']);
    let findings: typeof pageObjects.findings;

    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });
      findings = pageObjects.findings;

      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await findings.waitForPluginInitialized();

      // Prepare mocked findings
      await findings.index.remove();
      await findings.index.add(data);

      await findings.navigateToLatestFindingsPage();
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      const groupSelector = await findings.groupSelector();
      await groupSelector.openDropDown();
      await groupSelector.setValue('None');
      await findings.index.remove();
    });

    describe('Default Grouping', async () => {
      it('groups findings by resource and sort by compliance score desc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('Resource');

        const grouping = await findings.findingsGrouping();

        const resourceOrder = [
          {
            resourceName: 'kubelet',
            resourceId: data[0].resource.id,
            resourceSubType: data[0].resource.sub_type,
            findingsCount: '1',
            complianceScore: '0%',
          },
          {
            resourceName: cspmResourceName,
            resourceId: cspmResourceId,
            resourceSubType: cspmResourceSubType,
            findingsCount: '2',
            complianceScore: '50%',
          },
          {
            resourceName: 'Pod',
            resourceId: data[1].resource.id,
            resourceSubType: data[1].resource.sub_type,
            findingsCount: '1',
            complianceScore: '100%',
          },
        ];

        await asyncForEach(
          resourceOrder,
          async (
            { resourceName, resourceId, resourceSubType, findingsCount, complianceScore },
            index
          ) => {
            const groupRow = await grouping.getRowAtIndex(index);
            expect(await groupRow.getVisibleText()).to.contain(resourceName);
            expect(await groupRow.getVisibleText()).to.contain(resourceId);
            expect(await groupRow.getVisibleText()).to.contain(resourceSubType);
            expect(
              await (
                await groupRow.findByTestSubject('cloudSecurityFindingsComplianceScore')
              ).getVisibleText()
            ).to.be(complianceScore);
            expect(
              await (await groupRow.findByTestSubject('findings_grouping_counter')).getVisibleText()
            ).to.be(findingsCount);
          }
        );

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('3 resources');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');
      });
      it('groups findings by rule name and sort by compliance score desc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('Rule name');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('4 rules');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');

        const ruleNameOrder = [
          {
            ruleName: 'Upper case rule name',
            findingsCount: '1',
            complianceScore: '0%',
            benchmarkName: data[0].rule.benchmark.name,
          },
          {
            ruleName: 'some lower case rule name',
            findingsCount: '1',
            complianceScore: '0%',
            benchmarkName: data[3].rule.benchmark.name,
          },
          {
            ruleName: 'Another upper case rule name',
            findingsCount: '1',
            complianceScore: '100%',
            benchmarkName: data[2].rule.benchmark.name,
          },
          {
            ruleName: 'lower case rule name',
            findingsCount: '1',
            complianceScore: '100%',
            benchmarkName: data[1].rule.benchmark.name,
          },
        ];

        await asyncForEach(
          ruleNameOrder,
          async ({ ruleName, benchmarkName, findingsCount, complianceScore }, index) => {
            const groupRow = await grouping.getRowAtIndex(index);
            expect(await groupRow.getVisibleText()).to.contain(ruleName);
            expect(await groupRow.getVisibleText()).to.contain(benchmarkName);
            expect(
              await (
                await groupRow.findByTestSubject('cloudSecurityFindingsComplianceScore')
              ).getVisibleText()
            ).to.be(complianceScore);
            expect(
              await (await groupRow.findByTestSubject('findings_grouping_counter')).getVisibleText()
            ).to.be(findingsCount);
          }
        );
      });
      it('groups findings by cloud account and sort by compliance score desc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('Cloud account');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 cloud accounts');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');

        const cloudNameOrder = [
          {
            cloudName: 'Account 2',
            findingsCount: '1',
            complianceScore: '0%',
            benchmarkName: data[3].rule.benchmark.name,
          },
          {
            cloudName: 'Account 1',
            findingsCount: '1',
            complianceScore: '100%',
            benchmarkName: data[2].rule.benchmark.name,
          },
          {
            cloudName: 'No cloud account',
            findingsCount: '2',
            complianceScore: '50%',
            benchmarkName: data[0].rule.benchmark.name,
          },
        ];

        await asyncForEach(
          cloudNameOrder,
          async ({ cloudName, complianceScore, findingsCount, benchmarkName }, index) => {
            const groupRow = await grouping.getRowAtIndex(index);
            expect(await groupRow.getVisibleText()).to.contain(cloudName);

            if (cloudName !== 'No cloud account') {
              expect(await groupRow.getVisibleText()).to.contain(benchmarkName);
            }

            expect(
              await (
                await groupRow.findByTestSubject('cloudSecurityFindingsComplianceScore')
              ).getVisibleText()
            ).to.be(complianceScore);
            expect(
              await (await groupRow.findByTestSubject('findings_grouping_counter')).getVisibleText()
            ).to.be(findingsCount);
          }
        );
      });
      it('groups findings by Kubernetes cluster and sort by compliance score desc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('Kubernetes cluster');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 kubernetes clusters');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');

        const kubernetesOrder = [
          {
            clusterName: 'Cluster 1',
            findingsCount: '1',
            complianceScore: '0%',
            benchmarkName: data[0].rule.benchmark.name,
          },
          {
            clusterName: 'Cluster 2',
            findingsCount: '1',
            complianceScore: '100%',
            benchmarkName: data[1].rule.benchmark.name,
          },
          {
            clusterName: 'No Kubernetes cluster',
            findingsCount: '2',
            complianceScore: '50%',
          },
        ];

        await asyncForEach(
          kubernetesOrder,
          async ({ clusterName, complianceScore, findingsCount, benchmarkName }, index) => {
            const groupRow = await grouping.getRowAtIndex(index);
            expect(await groupRow.getVisibleText()).to.contain(clusterName);
            if (clusterName !== 'No Kubernetes cluster') {
              expect(await groupRow.getVisibleText()).to.contain(benchmarkName);
            }
            expect(
              await (
                await groupRow.findByTestSubject('cloudSecurityFindingsComplianceScore')
              ).getVisibleText()
            ).to.be(complianceScore);
            expect(
              await (await groupRow.findByTestSubject('findings_grouping_counter')).getVisibleText()
            ).to.be(findingsCount);
          }
        );
      });
    });
    describe('SearchBar', () => {
      it('add filter', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
        await groupSelector.openDropDown();
        await groupSelector.setValue('Resource');

        // Filter bar uses the field's customLabel in the DataView
        await filterBar.addFilter({ field: 'Rule Name', operation: 'is', value: ruleName1 });
        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(true);

        const grouping = await findings.findingsGrouping();

        const groupRow = await grouping.getRowAtIndex(0);
        expect(await groupRow.getVisibleText()).to.contain(data[0].resource.name);

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('1 resource');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('1 finding');
      });

      it('remove filter', async () => {
        await filterBar.removeFilter('rule.name');

        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(false);

        const grouping = await findings.findingsGrouping();
        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('3 resources');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');
      });

      it('set search query', async () => {
        await queryBar.setQuery(ruleName1);
        await queryBar.submitQuery();

        const grouping = await findings.findingsGrouping();

        const groupRow = await grouping.getRowAtIndex(0);
        expect(await groupRow.getVisibleText()).to.contain(data[0].resource.name);

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('1 resource');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('1 finding');

        await queryBar.setQuery('');
        await queryBar.submitQuery();

        expect(await grouping.getGroupCount()).to.be('3 resources');
        expect(await grouping.getUnitCount()).to.be('4 findings');
      });
    });

    describe('Group table', async () => {
      it('shows findings table when expanding', async () => {
        const grouping = await findings.findingsGrouping();
        const firstRow = await grouping.getRowAtIndex(0);
        await (await firstRow.findByCssSelector('button')).click();
        const latestFindingsTable = findings.createDataTableObject('latest_findings_table');
        expect(await latestFindingsTable.getRowsCount()).to.be(1);
        expect(await latestFindingsTable.hasColumnValue('rule.name', data[0].rule.name)).to.be(
          true
        );
      });
    });
    describe('Default Grouping - support muting rules', async () => {
      it('groups findings by resource after muting rule', async () => {
        const findingsCount = data.length;
        const resourceGroupCount = Array.from(new Set(data.map((obj) => obj.resource.name))).length;

        const finding = data[0];
        const rule = (await getCspBenchmarkRules('cis_k8s'))[0];
        const modifiedFinding = {
          ...finding,
          resource: {
            ...finding.resource,
            name: 'foo',
          },
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
        await pageObjects.header.waitUntilLoadingHasFinished();

        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('Resource');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be(`${resourceGroupCount + 1} resources`);

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be(`${findingsCount + 1} findings`);

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
        await pageObjects.header.waitUntilLoadingHasFinished();

        const groupCountAfterMute = await grouping.getGroupCount();
        expect(groupCountAfterMute).to.be(`${resourceGroupCount} resources`);

        const unitCountAfterMute = await grouping.getUnitCount();
        expect(unitCountAfterMute).to.be(`${findingsCount} findings`);
      });
    });
  });
}
