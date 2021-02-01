/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsScatterplotProvider({
  getService,
}: FtrProviderContext) {
  const canvasElement = getService('canvasElement');
  const testSubjects = getService('testSubjects');

  return new (class AnalyticsScatterplot {
    public async assertScatterplotMatrix(
      dataTestSubj: string,
      expectedColorStats: Array<{
        key: string;
        value: number;
      }>
    ) {
      await testSubjects.existOrFail(dataTestSubj);
      await testSubjects.existOrFail('mlScatterplotMatrix');

      const actualColorStats = await canvasElement.getColorStats(
        `[data-test-subj="mlScatterplotMatrix"] canvas`,
        expectedColorStats,
        1
      );
      expect(actualColorStats.every((d) => d.withinTolerance)).to.eql(
        true,
        `Color stats for scatterplot matrix should be within tolerance. Expected: '${JSON.stringify(
          expectedColorStats
        )}' (got '${JSON.stringify(actualColorStats)}')`
      );
    }
  })();
}
