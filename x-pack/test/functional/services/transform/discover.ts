/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformDiscoverProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertDiscoverQueryHits(expectedDiscoverQueryHits: string) {
      await testSubjects.existOrFail('unifiedHistogramQueryHits');

      const actualDiscoverQueryHits = await testSubjects.getVisibleText(
        'unifiedHistogramQueryHits'
      );

      expect(actualDiscoverQueryHits).to.eql(
        expectedDiscoverQueryHits,
        `Discover query hits should be ${expectedDiscoverQueryHits}, got ${actualDiscoverQueryHits}`
      );
    },

    async assertNoResults(expectedDestinationIndex: string) {
      await testSubjects.existOrFail('unifiedHistogramQueryHits');

      // Discover should use the destination index pattern
      const actualIndexPatternSwitchLinkText = await (
        await testSubjects.find('discover-dataView-switch-link')
      ).getVisibleText();
      expect(actualIndexPatternSwitchLinkText).to.eql(
        expectedDestinationIndex,
        `Destination index should be ${expectedDestinationIndex}, got ${actualIndexPatternSwitchLinkText}`
      );

      await testSubjects.existOrFail('discoverNoResults');
    },
  };
}
