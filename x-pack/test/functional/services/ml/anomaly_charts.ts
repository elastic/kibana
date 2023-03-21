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
  const retry = getService('retry');

  return {
    async assertAnomalyExplorerChartsCount(
      chartsContainerSubj: string | undefined,
      expectedChartsCount: number
    ) {
      await retry.tryForTime(5000, async () => {
        // For anomaly charts, time range expected is of the chart plotEarliest/plotLatest
        // and not of the global time range
        // but since plot earliest & latest might vary depends on the current time
        // we don't know the exact hashed id for sure
        // so we find first available chart container if id is not provided
        const chartsContainer =
          chartsContainerSubj !== undefined
            ? await testSubjects.find(chartsContainerSubj)
            : await testSubjects.find('mlExplorerChartsContainer');
        const actualChartsCount = (
          await chartsContainer?.findAllByClassName('ml-explorer-chart-container', 3000)
        ).length;
        expect(actualChartsCount).to.eql(
          expectedChartsCount,
          `Expect ${expectedChartsCount} charts to appear, got ${actualChartsCount}`
        );
      });
    },
  };
}
