/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiPaletteColorBlind } from '@elastic/eui';
import { getCategoryColor } from './topn';

describe('topn', () => {
  describe('getCategoryColor', () => {
    const categories = [
      { category: 'elasticsearch', expectedColor: '#FFC7DB' },
      { category: 'metricbeat', expectedColor: '#F6726A' },
      { category: 'auditbeat', expectedColor: '#FCD883' },
      { category: 'dockerd', expectedColor: '#F6726A' },
      { category: 'Other', expectedColor: '#EE72A6' },
      { category: 'node', expectedColor: '#61A2FF' },
      { category: 'filebeat', expectedColor: '#16C5C0' },
      { category: 'containerd', expectedColor: '#FFC9C2' },
      { category: 'C2 CompilerThre', expectedColor: '#A6EDEA' },
      { category: '[metrics]>worke', expectedColor: '#FFC7DB' },
    ];
    const colors = euiPaletteColorBlind({
      rotations: Math.ceil(categories.length / 10),
    });
    categories.map(({ category, expectedColor }) => {
      it(`returns correct color for category ${category}`, () => {
        expect(getCategoryColor({ category, subChartSize: categories.length, colors })).toEqual(
          expectedColor
        );
      });
    });
  });
});
