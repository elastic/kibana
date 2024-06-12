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
  const pageObjects = getPageObjects(['common', 'cloudPostureDashboard', 'header']);

  describe('Cloud Posture Dashboard Page', function () {
    this.tags(['cloud_security_posture_ui_sanity']);
    let cspDashboard: typeof pageObjects.cloudPostureDashboard;
    let dashboard: typeof pageObjects.cloudPostureDashboard.dashboard;

    before(async () => {
      cspDashboard = pageObjects.cloudPostureDashboard;
      dashboard = pageObjects.cloudPostureDashboard.dashboard;
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

      it('displays a number of resources evaluated greater than 3000', async () => {
        const resourcesEvaluated = await dashboard.getCloudResourcesEvaluated();
        const visibleText = await resourcesEvaluated.getVisibleText();
        const resourcesEvaluatedCount = parseInt(visibleText.replace(/,/g, ''), 10);
        expect(resourcesEvaluatedCount).greaterThan(3000);
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
    });
  });
};
