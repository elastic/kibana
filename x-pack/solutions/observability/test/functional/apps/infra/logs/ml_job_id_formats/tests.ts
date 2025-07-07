/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { assertIdFormats } from './assert_id_formats';
import { createMlJobHelper, MlJobHelper } from './ml_job_helper';
import { createRequestTracker } from './request_tracker';
import {
  hashedRateJob,
  hashedCategoriesCountJob,
  legacyRateJob,
  legacyCategoriesCountJob,
} from './ml_job_configs';

const anomalyDetectorsPattern =
  /anomaly_detectors\/.*-log-entry-(rate|categories-count)\/results\/overall_buckets/;

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['common']);
  const logsUi = getService('logsUi');
  const ml = getService('ml');
  const requestTracker = createRequestTracker(browser, pageObjects.common);
  let mlJobHelper: MlJobHelper;

  // Disabled until https://github.com/elastic/kibana/issues/171913 is addressed
  describe.skip('ML job ID formats', function () {
    this.beforeAll(async () => {
      // Access to ml.api has to happen inside a test or test hook
      mlJobHelper = createMlJobHelper(ml.api);
      await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
    });

    this.afterAll(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
    });

    describe('hashed format', () => {
      // The hashed format always takes priority. If, for some reason, the same job exists
      // in both formats, only the hashed format job will be used.

      it('loads rate job in the hashed ID format', async () => {
        await mlJobHelper.createMlJobs([hashedRateJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);

        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': 'hashed',
          'log-entry-categories-count': undefined,
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([hashedRateJob]);
      });

      it('loads category count job in the hashed ID format', async () => {
        await mlJobHelper.createMlJobs([hashedCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': undefined,
          'log-entry-categories-count': 'hashed',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([hashedCategoriesCountJob]);
      });

      it('loads rate and category count job in the hashed ID format', async () => {
        await mlJobHelper.createMlJobs([hashedRateJob, hashedCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': 'hashed',
          'log-entry-categories-count': 'hashed',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([hashedRateJob, hashedCategoriesCountJob]);
      });
    });

    describe('legacy format', () => {
      it('loads rate job in the legacy ID format', async () => {
        await mlJobHelper.createMlJobs([legacyRateJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': 'legacy',
          'log-entry-categories-count': undefined,
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([legacyRateJob]);
      });

      it('loads category count job in the legacy ID format', async () => {
        await mlJobHelper.createMlJobs([legacyCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': undefined,
          'log-entry-categories-count': 'legacy',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([legacyCategoriesCountJob]);
      });

      it('loads rate and category count job in the legacy ID format', async () => {
        await mlJobHelper.createMlJobs([legacyRateJob, legacyCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': 'legacy',
          'log-entry-categories-count': 'legacy',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([legacyRateJob, legacyCategoriesCountJob]);
      });
    });

    describe('mixed formats', () => {
      it('loads rate job in the hashed format and category count job in the legacy format', async () => {
        await mlJobHelper.createMlJobs([hashedRateJob, legacyCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': 'hashed',
          'log-entry-categories-count': 'legacy',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([hashedRateJob, legacyCategoriesCountJob]);
      });

      it('loads rate job in the legacy format and category count job in the hashed format', async () => {
        await mlJobHelper.createMlJobs([legacyRateJob, hashedCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });
        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();
        assertIdFormats(requests[0].url, {
          'log-entry-rate': 'legacy',
          'log-entry-categories-count': 'hashed',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([legacyRateJob, hashedCategoriesCountJob]);
      });
    });

    describe('creation and recreation', () => {
      it('create first ML job', async () => {
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getSetupScreen()).to.be.ok();
        });

        await logsUi.logEntryRatePage.startJobSetup();
        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getSetupFlyout()).to.be.ok();
        });

        await logsUi.logEntryRatePage.startRateJobCreation();
        await retry.waitFor(
          'Create ML job button is enabled',
          async () => await logsUi.logEntryRatePage.canCreateJob()
        );

        await logsUi.logEntryRatePage.createJob();
        await retry.waitFor(
          'ML job created',
          async () => await logsUi.logEntryRatePage.jobCreationDone()
        );

        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();

        assertIdFormats(requests[requests.length - 1].url, {
          'log-entry-rate': 'hashed',
          'log-entry-categories-count': undefined,
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([hashedRateJob]);
      });

      it('create second ML job', async () => {
        await mlJobHelper.createMlJobs([legacyRateJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });

        await logsUi.logEntryRatePage.manageMlJobs();
        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getSetupFlyout()).to.be.ok();
        });

        await logsUi.logEntryRatePage.startCategoriesCountJobCreation();
        await retry.waitFor(
          'Create ML job button is enabled',
          async () => await logsUi.logEntryRatePage.canCreateJob()
        );

        await logsUi.logEntryRatePage.createJob();
        await retry.waitFor(
          'ML job created',
          async () => await logsUi.logEntryRatePage.jobCreationDone()
        );

        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();

        assertIdFormats(requests[requests.length - 1].url, {
          'log-entry-rate': 'legacy',
          'log-entry-categories-count': 'hashed',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([legacyRateJob, hashedCategoriesCountJob]);
      });

      it('migrate legacy job', async () => {
        await mlJobHelper.createMlJobs([legacyRateJob, hashedCategoriesCountJob]);
        await logsUi.logEntryRatePage.navigateTo();
        await requestTracker.install();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
        });

        await logsUi.logEntryRatePage.manageMlJobs();
        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getSetupFlyout()).to.be.ok();
        });

        await logsUi.logEntryRatePage.startRateJobCreation();
        await retry.waitFor(
          'Recreate ML job button is enabled',
          async () => await logsUi.logEntryRatePage.canRecreateJob()
        );

        await logsUi.logEntryRatePage.recreateJob();
        await retry.waitFor(
          'ML job recreated',
          async () => await logsUi.logEntryRatePage.jobCreationDone()
        );

        const requests = await requestTracker.getRequests(anomalyDetectorsPattern, 2000);
        expect(requests).not.to.be.empty();

        assertIdFormats(requests[requests.length - 1].url, {
          'log-entry-rate': 'hashed',
          'log-entry-categories-count': 'hashed',
        });

        await requestTracker.uninstall();
        await mlJobHelper.deleteMlJobs([hashedRateJob, hashedCategoriesCountJob]);
      });
    });
  });
};
