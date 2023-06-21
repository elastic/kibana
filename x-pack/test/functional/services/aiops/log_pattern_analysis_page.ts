/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export function LogPatternAnalysisPageProvider({ getService, getPageObject }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertLogCategorizationPageExists() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('aiopsLogCategorizationPage');
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

    async assertTotalDocumentCount(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('aiopsTotalDocCount');
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },
  };
}
