/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'infraHome']);

  describe('Home page', function () {
    this.tags('includeFirefox');
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    describe('without metrics present', () => {
      before(async () => await esArchiver.unload('infra/metrics_and_logs'));

      it('renders an empty data prompt', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });
      after(async () => await esArchiver.unload('infra/metrics_and_logs'));

      it('renders the waffle map and tooltips for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.getWaffleMapTooltips();
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });
    });
  });
};
