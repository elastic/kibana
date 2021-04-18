/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const retry = getService('retry');

  describe.skip('Search session example', () => {
    const appId = 'searchExamples';

    before(async function () {
      await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
    });

    it('should have an other bucket', async () => {
      await PageObjects.timePicker.setAbsoluteRange(
        'Jan 1, 2014 @ 00:00:00.000',
        'Jan 1, 2016 @ 00:00:00.000'
      );
      await testSubjects.click('searchSourceWithOther');

      await retry.waitFor('has other bucket', async () => {
        await testSubjects.click('responseTab');
        const codeBlock = await testSubjects.find('responseCodeBlock');
        const visibleText = await codeBlock.getVisibleText();
        return visibleText.indexOf('__other__') > -1;
      });
    });
  });
}
