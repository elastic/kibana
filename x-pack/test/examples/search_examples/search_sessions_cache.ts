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
  const PageObjects = getPageObjects(['common']);
  const toasts = getService('toasts');
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  async function getExecutedAt() {
    const toast = await toasts.getToastElement(1);
    const timeElem = await testSubjects.findDescendant('requestExecutedAt', toast);
    const text = await timeElem.getVisibleText();
    await toasts.dismissAllToasts();
    await retry.waitFor('toasts gone', async () => {
      return (await toasts.getToastCount()) === 0;
    });
    return text;
  }

  describe('Search session client side cache', () => {
    const appId = 'searchExamples';

    before(async function () {
      await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
      await comboBox.setCustom('dataViewSelector', 'logstash-*');
      await comboBox.set('searchBucketField', 'extension.raw');
      await comboBox.set('searchMetricField', 'phpmemory');
    });

    it('should cache responses by search session id', async () => {
      await testSubjects.click('searchExamplesCacheSearch');
      const noSessionExecutedAt = await getExecutedAt();

      // Expect searches executed in a session to share a response
      await testSubjects.click('searchExamplesStartSession');
      await testSubjects.click('searchExamplesCacheSearch');
      const withSessionExecutedAt = await getExecutedAt();
      await testSubjects.click('searchExamplesCacheSearch');
      const withSessionExecutedAt2 = await getExecutedAt();
      expect(withSessionExecutedAt2).to.equal(withSessionExecutedAt);
      expect(withSessionExecutedAt).not.to.equal(noSessionExecutedAt);

      // Expect new session to run search again
      await testSubjects.click('searchExamplesStartSession');
      await testSubjects.click('searchExamplesCacheSearch');
      const secondSessionExecutedAt = await getExecutedAt();
      expect(secondSessionExecutedAt).not.to.equal(withSessionExecutedAt);

      // Clear session
      await testSubjects.click('searchExamplesClearSession');
      await testSubjects.click('searchExamplesCacheSearch');
      const afterClearSession1 = await getExecutedAt();
      await testSubjects.click('searchExamplesCacheSearch');
      const afterClearSession2 = await getExecutedAt();
      expect(secondSessionExecutedAt).not.to.equal(afterClearSession1);
      expect(afterClearSession2).not.to.equal(afterClearSession1);
    });
  });
}
