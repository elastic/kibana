/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DebugState } from '@elastic/charts';
import { DebugStateAxis } from '@elastic/charts/dist/state/types';
import { FtrProviderContext } from '../../ftr_provider_context';

type HeatmapDebugState = Required<Pick<DebugState, 'heatmap' | 'axes' | 'legend'>>;

export function SwimLaneProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async getDebugState(testSubj: string): Promise<HeatmapDebugState> {
      const chart = await testSubjects.find(testSubj);
      const chartStatusNode = await chart.findByClassName('echChartStatus');
      const debugState = await chartStatusNode.getAttribute('data-ech-debug-state');
      if (!debugState || debugState === '{}') {
        throw new Error('Debug state is not available');
      }
      return JSON.parse(debugState);
    },

    async getAxisLabels(testSubj: string, axis: 'x' | 'y'): Promise<DebugStateAxis['labels']> {
      const state = await this.getDebugState(testSubj);
      return state.axes[axis][0].labels;
    },

    async assertAxisLabels(testSubj: string, axis: 'x' | 'y', expectedValues: string[]) {
      const actualValues = await this.getAxisLabels(testSubj, axis);
      expect(actualValues).to.eql(
        expectedValues,
        `Expected swim lane ${axis} labels to be ${expectedValues}, got ${actualValues}`
      );
    },

    async getCells(testSubj: string): Promise<HeatmapDebugState['heatmap']['cells']> {
      const state = await this.getDebugState(testSubj);
      return state.heatmap.cells;
    },

    async selectSingleCell() {},

    async assertSwimlaneSelection() {},
  };
}
