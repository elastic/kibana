/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { DATES, NODE_DETAILS_PATH, DATE_PICKER_FORMAT } from './constants';

const START_HOST_KUBERNETES_SECTION_DATE = moment.utc(
  DATES.metricsAndLogs.hosts.kubernetesSectionStartDate
);
const END_HOST_KUBERNETES_SECTION_DATE = moment.utc(
  DATES.metricsAndLogs.hosts.kubernetesSectionEndDate
);

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const pageObjects = getPageObjects([
    'assetDetails',
    'common',
    'infraHome',
    'header',
    'timePicker',
    'svlCommonPage',
  ]);

  describe('Node Details', () => {
    describe('#With Asset Details', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');

        await pageObjects.svlCommonPage.loginWithRole('viewer');
        await pageObjects.common.navigateToApp(
          `metrics/${NODE_DETAILS_PATH}/demo-stack-kubernetes-01`
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      describe('Osquery Tab', () => {
        it('should not render in serverless', async () => {
          const OsqueryExist = await testSubjects.exists('infraAssetDetailsOsqueryTab');
          expect(OsqueryExist).to.be(false);
        });
      });

      describe('#With Kubernetes section', () => {
        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewTab();

            await pageObjects.timePicker.setAbsoluteRange(
              START_HOST_KUBERNETES_SECTION_DATE.format(DATE_PICKER_FORMAT),
              END_HOST_KUBERNETES_SECTION_DATE.format(DATE_PICKER_FORMAT)
            );
          });

          it('should show alerts', async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.assetDetails.overviewAlertsTitleExists();
            const CreateRuleButtonExist = await testSubjects.exists(
              'infraAssetDetailsCreateAlertsRuleButton'
            );
            expect(CreateRuleButtonExist).to.be(true);
          });

          [
            { metric: 'cpu', chartsCount: 2 },
            { metric: 'memory', chartsCount: 1 },
            { metric: 'disk', chartsCount: 2 },
            { metric: 'network', chartsCount: 1 },
            { metric: 'kubernetes', chartsCount: 2 },
          ].forEach(({ metric, chartsCount }) => {
            it(`should render ${chartsCount} ${metric} chart(s)`, async () => {
              await retry.try(async () => {
                const charts = await (metric === 'kubernetes'
                  ? pageObjects.assetDetails.getOverviewTabKubernetesMetricCharts()
                  : pageObjects.assetDetails.getOverviewTabHostMetricCharts(metric));

                expect(charts.length).to.equal(chartsCount);
              });
            });
          });
        });
      });
    });
  });
};
