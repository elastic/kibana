/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const toasts = getService('toasts');
  const retry = getService('retry');

  describe('Search session example', () => {
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

      const toast = await toasts.getToastElement(1);
      expect(toast).not.to.be(undefined);
      await testSubjects.click('responseTab');

      await retry.waitFor('has other bucket', async () => {
        const codeBlock = await testSubjects.find('responseCodeBlock');
        const visibleText = await codeBlock.getVisibleText();
        return visibleText.indexOf('__other__') > -1;
      });
    });
  });
}
