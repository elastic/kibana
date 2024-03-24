/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FINDINGS_WITH_RULES } from '../mocks/findings_rules_mock';
import { FunctionalFtrProviderContext } from '../../common/ftr_provider_context';
import { addIndexBulkDocs, deleteIndices } from '../../common/utils/index_api_helpers';
import { FINDINGS_INDEX, FINDINGS_LATEST_INDEX } from '../../common/utils/indices';
import { setupCSPPackage } from '../../common/utils/csp_package_helpers';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FunctionalFtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const supertest = getService('supertest');
  const es = getService('es');
  const toasts = getService('toasts');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);

  // We need to use a dataset for the tests to run
  const data = FINDINGS_WITH_RULES;

  const ruleName1 = data[0].rule.name;

  describe('Findings Page - Alerts', function () {
    this.tags(['cloud_security_posture_findings_alerts']);
    let findings: typeof pageObjects.findings;
    let latestFindingsTable: typeof findings.latestFindingsTable;
    let misconfigurationsFlyout: typeof findings.misconfigurationsFlyout;

    before(async () => {
      findings = pageObjects.findings;
      latestFindingsTable = findings.latestFindingsTable;
      misconfigurationsFlyout = findings.misconfigurationsFlyout;
      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await setupCSPPackage(retry, log, supertest);
      // Prepare mocked findings
      await deleteIndices(es, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);
      await addIndexBulkDocs(es, data, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);
    });

    after(async () => {
      await deleteIndices(es, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);
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

        const toastMessage = await (await toasts.toastMessageByTestSubj()).getElement();
        expect(toastMessage).to.be.ok();

        const toastMessageTitle = await toastMessage.findByTestSubject('csp:toast-success-title');
        expect(await toastMessageTitle.getVisibleText()).to.be(ruleName1);

        await (await toasts.toastMessageByTestSubj()).clickToastMessageLink();

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

        const toastMessage = await (await toasts.toastMessageByTestSubj()).getElement();
        expect(toastMessage).to.be.ok();

        const toastMessageTitle = await toastMessage.findByTestSubject('csp:toast-success-title');
        expect(await toastMessageTitle.getVisibleText()).to.be(ruleName1);

        await (await toasts.toastMessageByTestSubj()).clickToastMessageLink();

        const rulePageTitle = await testSubjects.find('header-page-title');
        expect(await rulePageTitle.getVisibleText()).to.be(ruleName1);
      });
    });
    describe('Rule details', () => {
      it('The rule page contains the expected matching data', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        await misconfigurationsFlyout.clickTakeActionCreateRuleButton();

        await (await toasts.toastMessageByTestSubj()).clickToastMessageLink();

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

        expect(await (await testSubjects.find('ruleName')).getVisibleText()).to.be(ruleName1);
      });
      it('Clicking on count of Alerts should navigate to the alerts page', async () => {
        await latestFindingsTable.openFlyoutAt(0);
        await misconfigurationsFlyout.clickTakeActionCreateRuleButton();
        const flyout = await misconfigurationsFlyout.getElement();
        await (await flyout.findByTestSubject('csp:findings-flyout-alert-count')).click();

        expect(await (await testSubjects.find('header-page-title')).getVisibleText()).to.be(
          'Alerts'
        );
      });
    });
  });
}
