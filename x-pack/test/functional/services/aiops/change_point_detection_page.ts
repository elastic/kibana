/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function ChangePointDetectionPageProvider({
  getService,
  getPageObject,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async navigateToIndexPatternSelection() {
      await testSubjects.click('mlMainTab changePointDetection');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async assertChangePointDetectionPageExists() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('aiopsChangePointDetectionPage');
      });
    },

    async assertQueryInput(expectedQueryString: string) {
      const aiopsQueryInput = await testSubjects.find('aiopsQueryInput');
      const actualQueryString = await aiopsQueryInput.getVisibleText();
      expect(actualQueryString).to.eql(
        expectedQueryString,
        `Expected query bar text to be '${expectedQueryString}' (got '${actualQueryString}')`
      );
    },
  };
}
