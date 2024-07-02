/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
  const queryBar = getService('queryBar');

  describe('Findings Page - Sanity Tests', function () {
    this.tags(['cloud_security_posture_ui_sanity']);
    let findings: typeof pageObjects.findings;

    before(async () => {
      findings = pageObjects.findings;
      await findings.navigateToLatestFindingsPage();
      await findings.waitForPluginInitialized();
    });

    describe('Findings - Querying data', () => {
      beforeEach(async () => {
        const groupSelector = await findings.groupSelector();
        await groupSelector.openDropDown();
        await groupSelector.setValue('None');
      });

      const testCases = [
        {
          query:
            'cloud.provider : "aws" and cloud.region : "eu-west-3" and result.evaluation : "failed"  and rule.tags : "CIS 5.4"',
          provider: 'aws',
          expectedRowsCount: 3,
          expectedGroupCount: '1 cloud account',
          expectedUnitCount: '3 findings',
        },
        {
          query:
            'cloud.provider : "gcp" and rule.benchmark.rule_number : "3.1" and result.evaluation : "failed"',
          provider: 'gcp',
          expectedRowsCount: 1,
          expectedGroupCount: '1 cloud account',
          expectedUnitCount: '1 finding',
        },
        {
          query:
            'cloud.provider : "azure" and rule.benchmark.rule_number : "7.2" and result.evaluation : "failed"',
          provider: 'azure',
          expectedRowsCount: 1,
          expectedGroupCount: '1 cloud account',
          expectedUnitCount: '1 finding',
        },
        {
          query:
            'rule.benchmark.id : "cis_k8s" and rule.benchmark.rule_number : "4.2.4" and result.evaluation : "failed"',
          provider: 'k8s',
          expectedRowsCount: 2,
          expectedGroupCount: '0 cloud accounts',
          expectedUnitCount: '2 findings',
        },
        {
          query: 'rule.benchmark.id : "cis_eks" and rule.benchmark.rule_number : "3.1.1"',
          provider: 'eks',
          expectedRowsCount: 2,
          expectedGroupCount: '0 cloud accounts',
          expectedUnitCount: '2 findings',
        },
      ];

      testCases.forEach(
        ({ query, provider, expectedRowsCount, expectedGroupCount, expectedUnitCount }) => {
          it(`Querying ${provider} provider data`, async () => {
            await queryBar.clearQuery();
            await queryBar.setQuery(query);
            await queryBar.submitQuery();
            // Get the number of rows in the data table
            const rowsCount = await findings
              .createDataTableObject('latest_findings_table')
              .getRowsCount();

            // Check that the number of rows matches the expected count
            expect(rowsCount).to.be(expectedRowsCount);
            const groupSelector = await findings.groupSelector();
            await groupSelector.openDropDown();
            await groupSelector.setValue('Cloud account');
            const grouping = await findings.findingsGrouping();

            const groupCount = await grouping.getGroupCount();
            expect(groupCount).to.be(expectedGroupCount);

            const unitCount = await grouping.getUnitCount();
            expect(unitCount).to.be(expectedUnitCount);
          });
        }
      );
    });
  });
};
