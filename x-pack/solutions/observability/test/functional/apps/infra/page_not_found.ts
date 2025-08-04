/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_ENABLE_LOGS_STREAM } from '@kbn/management-settings-ids';
import { FtrProviderContext } from '../../ftr_provider_context';

const logsPages = ['logs/stream', 'logs/anomalies', 'logs/log-categories', 'logs/settings'];

const metricsPages = [
  'metrics/inventory',
  'metrics/hosts',
  'metrics/explorer',
  'metrics/settings',
  'metrics/detail/hosts/host_name',
];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'infraHome']);
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  describe('Infra Not Found page', function () {
    this.tags('includeFirefox');

    describe('Logs', () => {
      before(async () => {
        await kibanaServer.uiSettings.update({ [OBSERVABILITY_ENABLE_LOGS_STREAM]: true });
      });
      after(async () => {
        await kibanaServer.uiSettings.update({ [OBSERVABILITY_ENABLE_LOGS_STREAM]: false });
      });

      it('should render the not found page when the route does not exist', async () => {
        await pageObjects.common.navigateToApp('logs/broken-link');
        await testSubjects.existOrFail('infraNotFoundPage');

        const titleElement = await find.byCssSelector('h1');
        const title = await titleElement.getVisibleText();

        expect(title).to.contain('Logs');
      });

      it('should NOT render the not found page when the route exist', async () => {
        // Sequential browsing across pages
        for (const appName of logsPages) {
          await pageObjects.common.navigateToApp(appName);
          await testSubjects.missingOrFail('infraNotFoundPage');
        }
      });
    });

    describe('Metrics', () => {
      it('should render the not found page when the route does not exist', async () => {
        await pageObjects.common.navigateToApp('metrics/broken-link');
        await testSubjects.existOrFail('infraNotFoundPage');

        const titleElement = await find.byCssSelector('h1');
        const title = await titleElement.getVisibleText();

        expect(title).to.contain('Infrastructure');
      });

      it('should NOT render the not found page when the route exist', async () => {
        // Sequential browsing across pages
        for (const appName of metricsPages) {
          await pageObjects.common.navigateToApp(appName);
          await testSubjects.missingOrFail('infraNotFoundPage');
        }
      });
    });
  });
};
