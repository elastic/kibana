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

  describe('Partial results example', () => {
    const appId = 'searchExamples';

    before(async function () {
      await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
      await testSubjects.click('/search');
    });

    it('should update a progress bar', async () => {
      await testSubjects.click('responseTab');
      const progressBar = await testSubjects.find('progressBar');
      expect(await progressBar.getAttribute('value')).to.be('0');
      expect(await progressBar.getAttribute('max')).to.be('100');

      await testSubjects.click('requestFibonacci');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const value = await progressBar.getAttribute('value');
      expect(value).to.be.greaterThan(0);
    });
  });
}
