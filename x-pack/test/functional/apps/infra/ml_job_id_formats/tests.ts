/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { assertIdFormats } from './assert_id_formats';
import { createMlJobHelper, MlJobHelper } from './ml_job_helper';
import { createRequestTracker } from './request_tracker';
import { legacyRateJob, hashedRateJob } from './ml_job_configs';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const logsUi = getService('logsUi');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const browser = getService('browser');
  const pageObjects = getPageObjects(['common']);
  const requestTracker = createRequestTracker(browser, pageObjects.common);
  let mlJobHelper: MlJobHelper;

  describe('ML job ID formats', function () {
    this.tags('includeFirefox');

    this.beforeAll(async () => {
      // Access to ml.api has to happen inside a test or test hook
      mlJobHelper = createMlJobHelper(ml.api);
    });

    it('loads jobs in the legacy ID format', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
      await mlJobHelper.createMlJob(legacyRateJob);
      await logsUi.logEntryRatePage.navigateTo();
      await requestTracker.install();

      await retry.try(async () => {
        expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
      });
      const requests = await requestTracker.getRequests(
        /anomaly_detectors\/.*-log-entry-(rate|categories-count)\/results\/overall_buckets/,
        2000
      );
      expect(requests).not.to.be.empty();
      assertIdFormats(requests[0].url, {
        'log-entry-rate': 'legacy',
        'log-entry-categories-count': undefined,
      });

      await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      await requestTracker.uninstall();
      await mlJobHelper.deleteMlJob(legacyRateJob);
    });

    it('loads jobs in the hashed ID format', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
      await mlJobHelper.createMlJob(hashedRateJob);
      await logsUi.logEntryRatePage.navigateTo();
      await requestTracker.install();

      await retry.try(async () => {
        expect(await logsUi.logEntryRatePage.getResultsScreen()).to.be.ok();
      });
      const requests = await requestTracker.getRequests(
        /anomaly_detectors\/.*-log-entry-(rate|categories-count)\/results\/overall_buckets/,
        2000
      );
      expect(requests).not.to.be.empty();
      assertIdFormats(requests[0].url, {
        'log-entry-rate': 'hashed',
        'log-entry-categories-count': undefined,
      });

      await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      await requestTracker.uninstall();
      await mlJobHelper.deleteMlJob(hashedRateJob);
    });
  });
};
