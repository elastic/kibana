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
      it('displays accurate summary compliance score', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const scoreElement = await dashboard.getCloudComplianceScore();
        expect((await scoreElement.getVisibleText()) === '41%').to.be(true);
      });

      it('displays accurate all complience scores', async () => {
        const scoresElements = await dashboard.getAllCloudComplianceScores();
        const scores: string[] = [];
        for (const scoreElement of scoresElements) {
          scores.push(await scoreElement.getVisibleText());
        }
        // 3 scores for each cloud provider + 1 summary score
        expect(scores.length).to.be(4);
        const expectedScores = ['41%', '14%', '55%', '59%'];
        scores.forEach((score) => {
          expect(expectedScores).contain(score);
        });
      });

      it('displays correct number of resources evaluated', async () => {
        const resourcesEvaluated = await dashboard.getCloudResourcesEvaluated();
        expect((await resourcesEvaluated.getVisibleText()) === '3,339').to.be(true);
      });
    });

    describe('Kubernetes Dashboard', () => {
      it('displays accurate summary compliance score', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const scoreElement = await dashboard.getKubernetesComplianceScore();
        expect((await scoreElement.getVisibleText()) === '83%').to.be(true);
      });

      it('displays correct number of resources evaluated', async () => {
        const resourcesEvaluated = await dashboard.getKubernetesResourcesEvaluated();
        expect((await resourcesEvaluated.getVisibleText()) === '199').to.be(true);
      });
    });
  });
};
