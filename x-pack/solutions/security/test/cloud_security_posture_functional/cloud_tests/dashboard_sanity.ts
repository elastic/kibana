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
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'cloudPostureDashboard', 'header', 'findings']);

  describe('Cloud Posture Dashboard Page - Sanity Tests', function () {
    this.tags(['cloud_security_posture_ui_sanity']);
    let cspDashboard: typeof pageObjects.cloudPostureDashboard;
    let dashboard: typeof pageObjects.cloudPostureDashboard.dashboard;
    let findings: typeof pageObjects.findings;
    let TAB_TYPES: typeof pageObjects.cloudPostureDashboard.TAB_TYPES;

    before(async () => {
      cspDashboard = pageObjects.cloudPostureDashboard;
      dashboard = pageObjects.cloudPostureDashboard.dashboard;
      findings = pageObjects.findings;
      TAB_TYPES = pageObjects.cloudPostureDashboard.TAB_TYPES;
      await cspDashboard.waitForPluginInitialized();
      await cspDashboard.navigateToComplianceDashboardPage();
      await retry.waitFor(
        'Cloud posture integration dashboard to be displayed',
        async () => !!dashboard.getIntegrationDashboardContainer()
      );
    });

    describe('Cloud Dashboard', () => {
      it('displays compliance score greater than 40', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const scoreElement = await dashboard.getCloudComplianceScore();
        const score = parseInt((await scoreElement.getVisibleText()).replace('%', ''), 10);
        expect(score).to.be.greaterThan(40);
      });

      it('displays all compliance scores', async () => {
        const scoresElements = await dashboard.getAllCloudComplianceScores();
        const scores: string[] = [];
        for (const scoreElement of scoresElements) {
          scores.push(await scoreElement.getVisibleText());
        }
        // 3 scores for each cloud provider + 1 summary score
        expect(scores.length).to.be(4);
      });

      it('displays a number of resources evaluated greater than 1500', async () => {
        const resourcesEvaluated = await dashboard.getCloudResourcesEvaluated();
        const visibleText = await resourcesEvaluated.getVisibleText();
        const resourcesEvaluatedCount = parseInt(visibleText.replace(/,/g, ''), 10);
        expect(resourcesEvaluatedCount).greaterThan(1500);
      });

      it('Compliance By CIS sections have non empty values', async () => {
        const complianceScoresChartPanel = await dashboard.getAllComplianceScoresByCisSection(
          TAB_TYPES.CLOUD
        );
        expect(complianceScoresChartPanel.length).to.be.greaterThan(0);
        for (const score of complianceScoresChartPanel) {
          const scoreValue = await score.getVisibleText();
          // Check if the score is a percentage
          expect(scoreValue).to.match(/^\d+%$/);
        }
      });

      it('Navigation to Findings page', async () => {
        const findingsLinkCount = await dashboard.getFindingsLinksCount(TAB_TYPES.CLOUD);
        for (let i = 0; i < findingsLinkCount; i++) {
          const link = await dashboard.getFindingsLinkAtIndex(TAB_TYPES.CLOUD, i);
          await link.click();
          await pageObjects.header.waitUntilLoadingHasFinished();
          const groupSelector = await findings.groupSelector();
          await groupSelector.openDropDown();
          await groupSelector.setValue('None');
          expect(
            await findings.createDataTableObject('latest_findings_table').getRowsCount()
          ).to.be.greaterThan(0);
          await cspDashboard.navigateToComplianceDashboardPage();
          await pageObjects.header.waitUntilLoadingHasFinished();
        }
      });
    });

    describe('Kubernetes Dashboard', () => {
      it('displays compliance score greater than 80', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const scoreElement = await dashboard.getKubernetesComplianceScore();
        const score = parseInt((await scoreElement.getVisibleText()).replace('%', ''), 10);
        expect(score).to.be.greaterThan(80);
      });

      it('displays a number of resources evaluated greater than 150', async () => {
        const resourcesEvaluated = await dashboard.getKubernetesResourcesEvaluated();
        const resourcesEvaluatedCount = parseInt(
          (await resourcesEvaluated.getVisibleText()).replace(/,/g, ''),
          10
        );
        expect(resourcesEvaluatedCount).greaterThan(150);
      });

      it('Compliance By CIS sections have non empty values', async () => {
        const complianceScoresChartPanel = await dashboard.getAllComplianceScoresByCisSection(
          'Kubernetes'
        );
        expect(complianceScoresChartPanel.length).to.be.greaterThan(0);
        for (const score of complianceScoresChartPanel) {
          const scoreValue = await score.getVisibleText();
          // Check if the score is a percentage
          expect(scoreValue).to.match(/^\d+%$/);
        }
      });

      it('Navigation to Findings page', async () => {
        const findingsLinkCount = await dashboard.getFindingsLinksCount(TAB_TYPES.KUBERNETES);
        for (let i = 0; i < findingsLinkCount; i++) {
          const link = await dashboard.getFindingsLinkAtIndex(TAB_TYPES.KUBERNETES, i);
          await link.click();
          await pageObjects.header.waitUntilLoadingHasFinished();
          const groupSelector = await findings.groupSelector();
          await groupSelector.openDropDown();
          await groupSelector.setValue('None');
          expect(
            await findings.createDataTableObject('latest_findings_table').getRowsCount()
          ).to.be.greaterThan(0);
          await cspDashboard.navigateToComplianceDashboardPage();
          await pageObjects.header.waitUntilLoadingHasFinished();
          await dashboard.getKubernetesDashboard();
        }
      });
    });
  });
};
