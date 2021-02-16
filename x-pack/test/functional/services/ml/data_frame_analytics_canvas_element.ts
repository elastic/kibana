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
      }>
    ) {
      await testSubjects.existOrFail(dataTestSubj);

      const actualColorStats = await canvasElement.getColorStats(
        `[data-test-subj="${dataTestSubj}"] canvas`,
        expectedColorStats,
        1
      );
      expect(actualColorStats.every((d) => d.withinTolerance)).to.eql(
        true,
        `Color stats for canvas element should be within tolerance. Expected: '${JSON.stringify(
          expectedColorStats
        )}' (got '${JSON.stringify(actualColorStats)}')`
      );
    }
  })();
}
