/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const infraSourceConfigurationFlyout = getService('infraSourceConfigurationFlyout');
  const pageObjects = getPageObjects(['common', 'infraLogs']);

  describe('Logs Page', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('with logs present', () => {
      before(async () => {
        await esArchiver.load('infra/metrics_and_logs');
      });
      after(async () => {
        await esArchiver.unload('infra/metrics_and_logs');
      });

      it('renders the log stream', async () => {
        await pageObjects.common.navigateToApp('infraLogs');
        await pageObjects.infraLogs.getLogStream();
      });

      it('can change the log indices to a pattern that matches nothing', async () => {
        await pageObjects.infraLogs.openSourceConfigurationFlyout();

        const nameInput = await infraSourceConfigurationFlyout.getNameInput();
        await nameInput.clearValue();
        await nameInput.type('Modified Source');

        const logIndicesInput = await infraSourceConfigurationFlyout.getLogIndicesInput();
        await logIndicesInput.clearValue();
        await logIndicesInput.type('does-not-exist-*');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the no indices screen when no indices match the pattern', async () => {
        await pageObjects.infraLogs.getNoLogsIndicesPrompt();
      });

      it('can change the log indices back to a pattern that matches something', async () => {
        await pageObjects.infraLogs.openSourceConfigurationFlyout();

        const logIndicesInput = await infraSourceConfigurationFlyout.getLogIndicesInput();
        await logIndicesInput.clearValue();
        await logIndicesInput.type('filebeat-*');

        await infraSourceConfigurationFlyout.saveConfiguration();
        await infraSourceConfigurationFlyout.closeFlyout();
      });

      it('renders the log stream again', async () => {
        await pageObjects.infraLogs.getLogStream();
      });
    });
  });
};
