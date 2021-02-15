/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsMapProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertMapElementsExists() {
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsMapTitle');
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsMapLegend');
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsMapCytoscape');
    },
    async assertJobMapTitle(id: string) {
      const expected = `Map for analytics ID ${id}`;
      const actualTitle = await testSubjects.getVisibleText('mlPageDataFrameAnalyticsMapTitle');
      expect(actualTitle).to.eql(
        expected,
        `Title for map should be '${expected}' (got '${actualTitle}')`
      );
    },
  };
}
