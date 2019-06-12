/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { DATES } from './constants';

const DATE_WITH_DATA = new Date(DATES.metricsAndLogs.hosts.withData);

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const infraSourceConfigurationFlyout = getService('infraSourceConfigurationFlyout');
  const pageObjects = getPageObjects(['common', 'infraHome']);

  describe('Infrastructure Snapshot Page', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('infra/metrics_and_logs');
      });

      it('renders the waffle map', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });

      it('can change the metric indices to a pattern that matches nothing', async () => {
        await pageObjects.infraHome.openSourceConfigurationFlyout();
        await infraSourceConfigurationFlyout.switchToIndicesAndFieldsTab();

        const nameInput = await infraSourceConfigurationFlyout.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const metricIndicesInput = await infraSourceConfigurationFlyout.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });

      it('can change the log indices back to a pattern that matches something', async () => {
        await pageObjects.infraHome.openSourceConfigurationFlyout();
        await infraSourceConfigurationFlyout.switchToIndicesAndFieldsTab();

        const metricIndicesInput = await infraSourceConfigurationFlyout.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('metricbeat-*');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the log stream again', async () => {
        await pageObjects.infraHome.getWaffleMap();
      });
    });
  });
};
