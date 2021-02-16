/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsCanvasElementProvider({
  getService,
}: FtrProviderContext) {
  const canvasElement = getService('canvasElement');
  const testSubjects = getService('testSubjects');

  return new (class AnalyticsCanvasElement {
    public async assertCanvasElement(
      dataTestSubj: string,
      expectedColorStats: Array<{
        key: string;
        value: number;
      }>,
      exclude?: string[],
      percentageThreshold = 1
    ) {
      await testSubjects.existOrFail(dataTestSubj);

      const sortedExpectedColorStats = [...expectedColorStats].sort((a, b) =>
        a.key.localeCompare(b.key)
      );

      const actualColorStats = await canvasElement.getColorStats(
        `[data-test-subj="${dataTestSubj}"] canvas`,
        sortedExpectedColorStats,
        exclude,
        percentageThreshold
      );
      expect(actualColorStats.length).to.eql(
        sortedExpectedColorStats.length,
        `Expected and actual color stats for '${dataTestSubj}' should have the same amount of elements. Expected: ${sortedExpectedColorStats.length} (got ${actualColorStats.length})`
      );
      expect(actualColorStats.every((d) => d.withinTolerance)).to.eql(
        true,
        `Color stats for '${dataTestSubj}' should be within tolerance. Expected: '${JSON.stringify(
          sortedExpectedColorStats
        )}' (got '${JSON.stringify(actualColorStats)}')`
      );
    }
  })();
}
