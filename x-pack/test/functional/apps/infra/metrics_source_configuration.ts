/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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

        await infraSourceConfigurationForm.saveInfraSettings();

        await pageObjects.infraHome.waitForLoading();
        await pageObjects.infraHome.getInfraMissingMetricsIndicesCallout();
      });

      it('can clear the input and reset to previous values without saving', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        const previousNameInputText = await nameInput.getAttribute('value');
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('New Source');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('this-is-new-change-*');

        await infraSourceConfigurationForm.discardInfraSettingsChanges();

        // Check for previous value
        const nameInputText = await nameInput.getAttribute('value');
        expect(nameInputText).to.equal(previousNameInputText);
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });

      it('can change the metric indices to a remote cluster when connection does not exist', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const nameInput = await infraSourceConfigurationForm.getNameInput();
        await nameInput.clearValueWithKeyboard({ charByChar: true });
        await nameInput.type('Modified Source');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('remote_cluster:metricbeat-*');

        await infraSourceConfigurationForm.saveInfraSettings();

        await pageObjects.infraHome.waitForLoading();
        await pageObjects.infraHome.getInfraMissingRemoteClusterIndicesCallout();
      });

      it('renders the no remote cluster screen when no remote cluster connection is available', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoRemoteClusterPrompt();
      });

      it('can change the metric indices back to a pattern that matches something', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '/settings');

        const metricIndicesInput = await infraSourceConfigurationForm.getMetricIndicesInput();
        await metricIndicesInput.clearValueWithKeyboard({ charByChar: true });
        await metricIndicesInput.type('metricbeat-*');

        await infraSourceConfigurationForm.saveInfraSettings();
      });

      it('renders the waffle map again', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
      });
    });
  });
};
