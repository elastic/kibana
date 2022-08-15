/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const infraSourceConfigurationForm = getService('infraSourceConfigurationForm');
  const pageObjects = getPageObjects(['common', 'infraHome']);
  const kibanaServer = getService('kibanaServer');

  describe('Infrastructure Source Configuration', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('renders the waffle map', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });

      it('can change the metric indices to a pattern that matches nothing', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });

      it('can change the metric indices back to a pattern that matches something', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('metricbeat-*');

        await infraSourceConfigurationForm.saveConfiguration();
      });

      it('renders the waffle map again', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });
    });
  });
};
