/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import { asyncForEach } from '@kbn/std';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
  const chance = new Chance();

  // We need to use a dataset for the tests to run
  // We intentionally make some fields start with a capital letter to test that the query bar is case-insensitive/case-sensitive
  const data = [
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: 'passed' },
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
      cluster_id: 'Upper case cluster id',
    },
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
      result: { evaluation: 'passed' },
      cloud: {
        account: {
          id: '1',
          name: 'Account 1',
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
      cluster_id: 'Another Upper case cluster id',
    },
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `process`, sub_type: 'another lower case type' },
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
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'lower case cluster id',
    },
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `process`, sub_type: 'Upper case type again' },
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
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'another lower case cluster id',
    },
  ];

  const ruleName1 = data[0].rule.name;

  describe('Findings Page - Grouping', function () {
    this.tags(['cloud_security_posture_findings_grouping']);
    let findings: typeof pageObjects.findings;
    // let groupSelector: ReturnType<typeof findings.groupSelector>;

    before(async () => {
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
      it('groups findings by resource and sort by failed findings desc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('Resource');

        const grouping = await findings.findingsGrouping();

        const resourceOrder = [
          {
            resourceName: 'process',
            resourceId: data[2].resource.id,
            resourceSubType: data[2].resource.sub_type,
            findingsCount: 2,
          },
          {
            resourceName: 'Pod',
            resourceId: data[1].resource.id,
            resourceSubType: data[1].resource.sub_type,
            findingsCount: 1,
          },
          {
            resourceName: 'kubelet',
            resourceId: data[0].resource.id,
            resourceSubType: data[0].resource.sub_type,
            findingsCount: 1,
          },
        ];

        await asyncForEach(
          resourceOrder,
          async ({ resourceName, resourceId, resourceSubType, findingsCount }, index) => {
            const groupName = await grouping.getRowAtIndex(index);
            expect(await groupName.getVisibleText()).to.contain(resourceName);
            expect(await groupName.getVisibleText()).to.contain(resourceId);
            expect(await groupName.getVisibleText()).to.contain(resourceSubType);
            expect(await groupName.getVisibleText()).to.contain(`Findings : ${findingsCount}`);
          }
        );

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('3 groups');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');
      });
      it('groups findings by rule name and sort case sensitive asc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('Rule name');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('4 groups');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');

        const ruleNameOrder = [
          {
            ruleName: 'Another upper case rule name',
            findingsCount: 1,
            benchmarkName: data[1].rule.benchmark.name,
          },
          {
            ruleName: 'Upper case rule name',
            findingsCount: 1,
            benchmarkName: data[0].rule.benchmark.name,
          },
          {
            ruleName: 'lower case rule name',
            findingsCount: 1,
            benchmarkName: data[2].rule.benchmark.name,
          },
          {
            ruleName: 'some lower case rule name',
            findingsCount: 1,
            benchmarkName: data[3].rule.benchmark.name,
          },
        ];

        await asyncForEach(
          ruleNameOrder,
          async ({ ruleName, benchmarkName, findingsCount }, index) => {
            const groupName = await grouping.getRowAtIndex(index);
            expect(await groupName.getVisibleText()).to.contain(ruleName);
            expect(await groupName.getVisibleText()).to.contain(benchmarkName);
            expect(await groupName.getVisibleText()).to.contain(`Findings : ${findingsCount}`);
          }
        );
      });
      it('groups findings by cloud account and sort case sensitive asc', async () => {
        const groupSelector = await findings.groupSelector();

        await groupSelector.setValue('Cloud account');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('3 groups');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');

        const cloudNameOrder = ['Account 1', 'Account 2', '—'];

        await asyncForEach(cloudNameOrder, async (resourceName, index) => {
          const groupName = await grouping.getRowAtIndex(index);
          expect(await groupName.getVisibleText()).to.be(resourceName);
        });
      });
      it('groups findings by Kubernetes cluster and sort case sensitive asc', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.setValue('Kubernetes cluster');

        const grouping = await findings.findingsGrouping();

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('2 groups');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');

        const cloudNameOrder = ['Cluster 1', '—'];

        await asyncForEach(cloudNameOrder, async (resourceName, index) => {
          const groupName = await grouping.getRowAtIndex(index);
          expect(await groupName.getVisibleText()).to.be(resourceName);
        });
      });
    });
    describe('SearchBar', () => {
      it('add filter', async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.setValue('Resource');

        // Filter bar uses the field's customLabel in the DataView
        await filterBar.addFilter({ field: 'Rule Name', operation: 'is', value: ruleName1 });
        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(true);

        const grouping = await findings.findingsGrouping();

        const resourceOrder = ['kubelet'];

        await asyncForEach(resourceOrder, async (resourceName, index) => {
          const groupName = await grouping.getRowAtIndex(index);
          expect(await groupName.getVisibleText()).to.be(resourceName);
        });

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('1 group');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('1 finding');
      });

      it('remove filter', async () => {
        await filterBar.removeFilter('rule.name');

        expect(await filterBar.hasFilter('rule.name', ruleName1)).to.be(false);

        const grouping = await findings.findingsGrouping();
        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('3 groups');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('4 findings');
      });

      it('set search query', async () => {
        await queryBar.setQuery(ruleName1);
        await queryBar.submitQuery();

        const grouping = await findings.findingsGrouping();

        const resourceOrder = ['kubelet'];

        await asyncForEach(resourceOrder, async (resourceName, index) => {
          const groupName = await grouping.getRowAtIndex(index);
          expect(await groupName.getVisibleText()).to.be(resourceName);
        });

        const groupCount = await grouping.getGroupCount();
        expect(groupCount).to.be('1 group');

        const unitCount = await grouping.getUnitCount();
        expect(unitCount).to.be('1 finding');

        await queryBar.setQuery('');
        await queryBar.submitQuery();

        expect(await grouping.getGroupCount()).to.be('3 groups');
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
        expect(await latestFindingsTable.hasColumnValue('rule.name', 'lower case rule name')).to.be(
          true
        );
      });
    });
  });
}
