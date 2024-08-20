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
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
  const chance = new Chance();

  // We need to use a dataset for the tests to run
  const data = [
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        tags: ['CIS', 'CIS K8S'],
        rationale: 'rationale steps for rule 1.1',
        references: '1. https://elastic.co/rules/1.1',
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          rule_number: '1.1',
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
          remediation: 'remediation guide',
        },
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
    {
      '@timestamp': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        tags: ['CIS', 'CIS K8S'],
        rationale: 'rationale steps',
        references: '1. https://elastic.co',
        name: 'lower case rule name',
        section: 'Another upper case section',
        benchmark: {
          rule_number: '1.2',
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
          remediation: 'remediation guide',
        },
        type: 'process',
      },
      cluster_id: 'Another Upper case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
    {
      '@timestamp': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      resource: { id: chance.guid(), name: `process`, sub_type: 'another lower case type' },
      result: { evaluation: 'passed' },
      rule: {
        tags: ['CIS', 'CIS K8S'],
        rationale: 'rationale steps',
        references: '1. https://elastic.co',
        name: 'Another upper case rule name',
        section: 'lower case section',
        benchmark: {
          rule_number: '1.3',
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
          remediation: 'remediation guide',
        },
        type: 'process',
      },
      cluster_id: 'lower case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
    {
      '@timestamp': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      resource: { id: chance.guid(), name: `process`, sub_type: 'Upper case type again' },
      result: { evaluation: 'failed' },
      rule: {
        tags: ['CIS', 'CIS K8S'],
        rationale: 'rationale steps',
        references: '1. https://elastic.co',
        name: 'some lower case rule name',
        section: 'another lower case section',
        benchmark: {
          rule_number: '1.4',
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
          remediation: 'remediation guide',
        },
        type: 'process',
      },
      cluster_id: 'another lower case cluster id',
      data_stream: {
        dataset: 'cloud_security_posture.findings',
      },
    },
  ];

  const ruleName1 = data[0].rule.name;

  // Failing: See https://github.com/elastic/kibana/issues/168991
  describe.skip('Findings Page - Alerts', function () {
    this.tags(['cloud_security_posture_findings_alerts']);
    let findings: typeof pageObjects.findings;
    let latestFindingsTable: typeof findings.latestFindingsTable;
    let misconfigurationsFlyout: typeof findings.misconfigurationsFlyout;

    before(async () => {
      findings = pageObjects.findings;
      latestFindingsTable = findings.latestFindingsTable;
      misconfigurationsFlyout = findings.misconfigurationsFlyout;
      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await findings.waitForPluginInitialized();
      // Prepare mocked findings
      await findings.index.remove();
      await findings.index.add(data);
    });

    after(async () => {
      await findings.index.remove();
      await findings.detectionRuleApi.remove();
    });

    beforeEach(async () => {
      await findings.detectionRuleApi.remove();
      await findings.navigateToLatestFindingsPage();
      await retry.waitFor(
        'Findings table to be loaded',
        async () => (await latestFindingsTable.getRowsCount()) === data.length
      );
      pageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('Create detection rule', () => {
      it('Creates a detection rule from the Take Action button and navigates to rule page', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        await misconfigurationsFlyout.clickTakeActionCreateRuleButton();

        expect(
          await misconfigurationsFlyout.getVisibleText('csp:findings-flyout-alert-count')
        ).to.be('0 alerts');

        expect(
          await misconfigurationsFlyout.getVisibleText('csp:findings-flyout-detection-rule-count')
        ).to.be('1 detection rule');

        const toastMessageElement = await toasts.getElementByIndex();
        expect(toastMessageElement).to.be.ok();

        const toastMessageTitle = await toastMessageElement.findByTestSubject(
          'csp:toast-success-title'
        );
        expect(await toastMessageTitle.getVisibleText()).to.be(ruleName1);

        await testSubjects.click('csp:toast-success-link');

        await pageObjects.header.waitUntilLoadingHasFinished();
        const rulePageTitle = await testSubjects.find('header-page-title');
        expect(await rulePageTitle.getVisibleText()).to.be(ruleName1);
      });
      it('Creates a detection rule from the Alerts section and navigates to rule page', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        const flyout = await misconfigurationsFlyout.getElement();

        await (
          await flyout.findByTestSubject('csp:findings-flyout-create-detection-rule-link')
        ).click();

        expect(
          await misconfigurationsFlyout.getVisibleText('csp:findings-flyout-alert-count')
        ).to.be('0 alerts');

        expect(
          await misconfigurationsFlyout.getVisibleText('csp:findings-flyout-detection-rule-count')
        ).to.be('1 detection rule');

        const toastMessage = await toasts.getElementByIndex();
        expect(toastMessage).to.be.ok();

        const toastMessageTitle = await toastMessage.findByTestSubject('csp:toast-success-title');
        expect(await toastMessageTitle.getVisibleText()).to.be(ruleName1);

        await testSubjects.click('csp:toast-success-link');
        await pageObjects.header.waitUntilLoadingHasFinished();
        const rulePageTitle = await testSubjects.find('header-page-title');
        // Rule page title is not immediately available, so we need to retry until it is
        await retry.try(async () => {
          expect(await rulePageTitle.getVisibleText()).to.be(ruleName1);
        });
      });
    });
    describe('Rule details', () => {
      it('The rule page contains the expected matching data', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        await misconfigurationsFlyout.clickTakeActionCreateRuleButton();

        await testSubjects.click('csp:toast-success-link');
        await pageObjects.header.waitUntilLoadingHasFinished();
        const rulePageDescription = await testSubjects.find(
          'stepAboutRuleDetailsToggleDescriptionText'
        );
        expect(await rulePageDescription.getVisibleText()).to.be(data[0].rule.rationale);

        const severity = await testSubjects.find('severityPropertyValue');
        expect(await severity.getVisibleText()).to.be('Low');

        const referenceUrls = await testSubjects.find('urlsDescriptionReferenceLinkItem');
        expect(await referenceUrls.getVisibleText()).to.contain('https://elastic.co/rules/1.1');
      });
    });
    describe('Navigation', () => {
      it('Clicking on count of Rules should navigate to the rules page with benchmark tags as a filter', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        await misconfigurationsFlyout.clickTakeActionCreateRuleButton();
        const flyout = await misconfigurationsFlyout.getElement();
        await (await flyout.findByTestSubject('csp:findings-flyout-detection-rule-count')).click();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await (await testSubjects.find('ruleName')).getVisibleText()).to.be(ruleName1);
      });
      it('Clicking on count of Alerts should navigate to the alerts page', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        await misconfigurationsFlyout.clickTakeActionCreateRuleButton();
        const flyout = await misconfigurationsFlyout.getElement();
        await (await flyout.findByTestSubject('csp:findings-flyout-alert-count')).click();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await (await testSubjects.find('header-page-title')).getVisibleText()).to.be(
          'Alerts'
        );
      });
    });
  });
}
