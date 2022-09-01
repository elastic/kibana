/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export type MlAnomalyCharts = ProvidedType<typeof AnomalyChartsProvider>;

export function AnomalyChartsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertAnomalyExplorerChartsCount(
      chartsContainerSubj: string,
      expectedChartsCount: number
    ) {
      const chartsContainer = await testSubjects.find(chartsContainerSubj);
      const actualChartsCount = (
        await chartsContainer.findAllByClassName('ml-explorer-chart-container', 3000)
      ).length;
      expect(actualChartsCount).to.eql(
        expectedChartsCount,
        `Expect ${expectedChartsCount} charts to appear, got ${actualChartsCount}`
      );
    },
  };
}
