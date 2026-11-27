/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { averageDocumentSizes, dataStreamOf, estimateBytes } from './estimate';

const LOGS_1 = '.ds-logs-browser.otel-default-2026.11.24-000001';
const LOGS_2 = '.ds-logs-browser.otel-default-2026.11.25-000002';
const TRACES = '.ds-traces-browser.otel-default-2026.11.24-000001';

describe('dataStreamOf', () => {
  it('reads the data stream of a backing index and of a failure store index', () => {
    expect(dataStreamOf(LOGS_1)).toBe('logs-browser.otel-default');
    expect(dataStreamOf('.fs-logs-browser.otel-default-2026.11.24-000003')).toBe(
      'logs-browser.otel-default'
    );
  });

  it('keeps any other index, e.g. a legacy APM one, as it is', () => {
    expect(dataStreamOf('apm-7.17.0-transaction-000001')).toBe('apm-7.17.0-transaction-000001');
  });
});

describe('averageDocumentSizes', () => {
  it('averages over every backing index of a data stream, not per index', () => {
    const averages = averageDocumentSizes(
      new Map([
        [LOGS_1, { bytes: 1000, docs: 10 }],
        [LOGS_2, { bytes: 3000, docs: 10 }],
        [TRACES, { bytes: 500, docs: 2 }],
      ])
    );

    expect(averages).toEqual(
      new Map([
        ['logs-browser.otel-default', 200],
        ['traces-browser.otel-default', 250],
      ])
    );
  });

  it('has no average for a data stream without documents', () => {
    expect(averageDocumentSizes(new Map([[LOGS_1, { bytes: 0, docs: 0 }]])).size).toBe(0);
  });
});

describe('estimateBytes', () => {
  const averages = new Map([
    ['logs-browser.otel-default', 150],
    ['traces-browser.otel-default', 200.4],
  ]);

  it("adds each index's documents times its data stream's average, unrounded", () => {
    expect(
      estimateBytes(
        [
          { index: LOGS_1, docs: 10 },
          { index: LOGS_2, docs: 2 },
          { index: TRACES, docs: 3 },
        ],
        averages
      )
    ).toBeCloseTo(12 * 150 + 601.2);
  });

  it('leaves out documents without an average, and is null when none has one', () => {
    expect(
      estimateBytes(
        [
          { index: LOGS_1, docs: 1 },
          { index: 'unknown', docs: 99 },
        ],
        averages
      )
    ).toBe(150);
    expect(estimateBytes([{ index: 'unknown', docs: 99 }], averages)).toBeNull();
  });
});
