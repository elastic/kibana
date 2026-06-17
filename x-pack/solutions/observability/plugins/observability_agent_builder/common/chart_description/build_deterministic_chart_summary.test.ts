/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDeterministicChartSummary } from './build_deterministic_chart_summary';

describe('buildDeterministicChartSummary', () => {
  const mayFirst2024Noon = Date.parse('2024-05-01T12:00:00.000Z');
  const mayFirst2024One = Date.parse('2024-05-01T13:00:00.000Z');
  const formatTimestamp = (timestamp: number) => `t:${timestamp}`;

  it('summarizes a single series with peak and low values', () => {
    const summary = buildDeterministicChartSummary({
      chartTitle: 'Throughput',
      locale: 'en-US',
      timestampFormatter: formatTimestamp,
      series: [
        {
          title: 'Current period',
          data: [
            { x: mayFirst2024Noon, y: 100 },
            { x: mayFirst2024One, y: 300 },
          ],
        },
      ],
      valueFormatter: (value) => `${value} tpm`,
    });

    expect(summary).toContain('Summary for Throughput.');
    expect(summary).toContain('Current period');
    expect(summary).toContain('100 tpm');
    expect(summary).toContain('300 tpm');
    expect(summary).toContain('average of 200 tpm');
    expect(summary).toContain(`t:${mayFirst2024Noon}`);
    expect(summary).toContain(`t:${mayFirst2024One}`);
  });

  it('includes comparison text when a second series is present', () => {
    const summary = buildDeterministicChartSummary({
      chartTitle: 'Latency',
      locale: 'en-US',
      timestampFormatter: formatTimestamp,
      series: [
        {
          title: 'Current period',
          data: [
            { x: mayFirst2024Noon, y: 200 },
            { x: mayFirst2024One, y: 200 },
          ],
        },
        {
          title: 'Previous period',
          data: [
            { x: mayFirst2024Noon, y: 100 },
            { x: mayFirst2024One, y: 100 },
          ],
        },
      ],
      valueFormatter: (value) => `${value} ms`,
    });

    expect(summary).toContain('Previous period');
    expect(summary).toContain('average increased by 100%');
  });

  it('returns a no-data message when all series are empty', () => {
    const summary = buildDeterministicChartSummary({
      chartTitle: 'Failed transaction rate',
      series: [
        {
          title: 'Current period',
          data: [],
        },
      ],
    });

    expect(summary).toContain('no data in the selected time range');
  });
});
