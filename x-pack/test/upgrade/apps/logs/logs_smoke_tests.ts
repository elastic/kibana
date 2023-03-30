/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'timePicker']);
  const logsUi = getService('logsUi');

  describe('upgrade logs smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    spaces.forEach(({ space, basePath }) => {
      describe('space: ' + space, () => {
        before(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.home.launchSampleLogs('logs');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
        });

        it('should show log streams', async () => {
          const logStreamEntries = await logsUi.logStreamPage.getStreamEntries();
          expect(logStreamEntries.length).to.be.greaterThan(100);
        });
      });
    });
  });
}
