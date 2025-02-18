/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { DATES, INVENTORY_PATH, METRICS_EXPLORER_PATH } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;
const DATE_WITH_POD_WITH_DATA = DATES.metricsAndLogs.pods.withData;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header', 'infraHome', 'svlCommonPage']);
  const kibanaServer = getService('kibanaServer');

  const returnTo = async (path: string, timeout = 2000) =>
    retry.waitForWithTimeout('returned to inventory', timeout, async () => {
      await browser.goBack();
      await pageObjects.header.waitUntilLoadingHasFinished();
      const currentUrl = await browser.getCurrentUrl();
      return !!currentUrl.match(path);
    });

  describe('Infra pages', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    describe('Inventory page', function () {
      this.tags('includeFirefox');
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      describe('with metrics present', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
          await esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/pods_only');
          await pageObjects.common.navigateToApp(INVENTORY_PATH);
          await pageObjects.infraHome.waitForLoading();
        });
        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/pods_only');
        });

        it('renders the correct page title', async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();

          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain(
            'Infrastructure Inventory - Infrastructure - Observability - Elastic'
          );
        });

        it('renders an empty data prompt for dates with no data', async () => {
          await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
          await pageObjects.infraHome.getNoMetricsDataPrompt();
        });

        it('renders the waffle map and tooltips for dates with data', async () => {
          await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await pageObjects.infraHome.getWaffleMap();
        });

        describe('Redirect to Node Details page', () => {
          before(async () => {
            await pageObjects.common.navigateToApp(INVENTORY_PATH);
            await pageObjects.infraHome.waitForLoading();
          });

          it('Should redirect to Host Details page', async () => {
            await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
            await pageObjects.infraHome.goToHost();
            await pageObjects.infraHome.clickOnFirstNode();
            await pageObjects.infraHome.waitForLoading();
            await pageObjects.infraHome.clickOnNodeDetailsFlyoutOpenAsPage();

            await retry.try(async () => {
              const documentTitle = await browser.getTitle();
              expect(documentTitle).to.contain(
                'demo-stack-redis-01 - Infrastructure Inventory - Infrastructure - Observability - Elastic'
              );
            });

            await returnTo(INVENTORY_PATH);
          });

          it('Should redirect to Node Details page', async () => {
            await pageObjects.infraHome.goToPods();
            await pageObjects.infraHome.goToTime(DATE_WITH_POD_WITH_DATA);
            await pageObjects.infraHome.clickOnFirstNode();
            await pageObjects.infraHome.clickOnGoToNodeDetails();

            await retry.try(async () => {
              const documentTitle = await browser.getTitle();
              expect(documentTitle).to.contain(
                'pod-0 - Infrastructure Inventory - Infrastructure - Observability - Elastic'
              );
            });

            await returnTo(INVENTORY_PATH);
          });
        });
      });
    });
    describe('Metrics explorer page', function () {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp(METRICS_EXPLORER_PATH);
        await pageObjects.infraHome.waitForLoading();
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('should be disabled', async () => {
        await testSubjects.existOrFail('infraNotFoundPage');
      });
    });
  });
};
