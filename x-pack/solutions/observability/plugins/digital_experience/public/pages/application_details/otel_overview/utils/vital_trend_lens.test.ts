/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vitalTrendAttributes, vitalTrendConfig } from './vital_trend_lens';

const COLORS = { line: '#54b399', good: '#00bf6f', poor: '#e7664c' };
const QUERY =
  'FROM logs-*.otel-* | STATS p75 = PERCENTILE(x, 75) BY time = BUCKET(@timestamp, 50, ?_tstart, ?_tend)';

const configOf = (vital: 'lcp' | 'cls') =>
  vitalTrendConfig({ vital, title: 'LCP (p75)', query: QUERY, colors: COLORS });

describe('vitalTrendConfig', () => {
  it('draws the p75 column over the time column of the query', () => {
    const [line] = configOf('lcp').layers;

    expect(line).toMatchObject({
      type: 'line',
      data_source: { type: 'esql', query: QUERY },
      x: { column: 'time' },
      y: [{ column: 'p75', label: 'LCP (p75)', color: { type: 'static', color: '#54b399' } }],
    });
  });

  it("bands the vital's good values below and its poor ones above Google's thresholds", () => {
    const [, referenceLines] = configOf('lcp').layers;

    expect(referenceLines).toMatchObject({
      type: 'reference_lines',
      // From ES|QL too, so the chart has one data source and the lines share the vital's scale.
      data_source: { type: 'esql', query: 'ROW good = 2500, poor = 4000' },
      thresholds: [
        { column: 'good', fill: 'below', color: { type: 'static', color: '#00bf6f' } },
        { column: 'poor', fill: 'above', color: { type: 'static', color: '#e7664c' } },
      ],
    });
  });

  it('uses the thresholds of the vital charted', () => {
    const [, referenceLines] = configOf('cls').layers;

    expect(referenceLines).toMatchObject({
      data_source: { query: 'ROW good = 0.1, poor = 0.25' },
    });
  });

  it('shows the durations in milliseconds and CLS as a score', () => {
    const [lcpLine] = configOf('lcp').layers;
    const [clsLine] = configOf('cls').layers;

    expect(lcpLine).toMatchObject({ y: [{ format: { type: 'duration', from: 'ms' } }] });
    expect(clsLine).toMatchObject({ y: [{ format: { type: 'number', decimals: 3 } }] });
  });
});

describe('vitalTrendAttributes', () => {
  it('is a Lens XY chart over the ES|QL query', () => {
    const attributes = vitalTrendAttributes(configOf('lcp'));

    expect(attributes.visualizationType).toBe('lnsXY');
    expect(JSON.stringify(attributes.state)).toContain(QUERY);
    // One ES|QL data source for the line and the thresholds: a data view would add another scale.
    expect(Object.keys(attributes.state.datasourceStates)).toEqual(['textBased']);
  });
});
