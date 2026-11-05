/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { summarizeEsqlPage } from './esql_page_profile';

describe('summarizeEsqlPage', () => {
  it('summarizes available fields from an unprofiled partial response', () => {
    expect(
      summarizeEsqlPage({ columns: [], values: [[1]], took: 12, is_partial: true }, 18.3)
    ).toMatchObject({
      rows: 1,
      wallMs: 18,
      tookMs: 12,
      isPartial: true,
    });
  });

  it('tolerates absent profile fields and reports bounded operator summaries', () => {
    const summary = summarizeEsqlPage(
      {
        columns: [],
        values: [],
        profile: {
          drivers: [
            null,
            {
              description: 'data',
              cpu_nanos: 4000000,
              operators: [
                {
                  operator: 'LuceneSourceOperator[query details]',
                  status: { process_nanos: 3000000, documents_found: 7 },
                },
                {
                  operator: 'EvalOperator[expression]',
                  status: { process_nanos: 1000000, values_loaded: 4 },
                },
                { operator: 'LimitOperator', status: { process_nanos: 500000 } },
                { operator: 'OutputOperator', status: {} },
              ],
            },
          ],
        },
      },
      10
    );
    expect(summary).toMatchObject({
      cpuMs: 4,
      documentsFound: 7,
      valuesLoaded: 4,
      drivers: { data: 1 },
    });
    expect(summary.topOperators).toEqual([
      { operator: 'LuceneSourceOperator', ms: 3 },
      { operator: 'EvalOperator', ms: 1 },
      { operator: 'LimitOperator', ms: 0.5 },
    ]);
  });
  it('combines repeated drivers and operators before ranking and rounding', () => {
    const summary = summarizeEsqlPage(
      {
        columns: [],
        values: [],
        profile: {
          drivers: [
            {
              description: 'data',
              cpu_nanos: 10000000,
              operators: [
                {
                  operator: 'EvalOperator[expression]',
                  status: { process_nanos: 3002000, values_loaded: 4 },
                },
                {
                  operator: 'LuceneSourceOperator[first shard]',
                  status: { process_nanos: 1001000, documents_found: 7 },
                },
              ],
            },
            {
              description: 'data',
              cpu_nanos: 20000000,
              operators: [
                {
                  operator: 'LuceneSourceOperator[second shard]',
                  status: { process_nanos: 2002000, documents_found: 5 },
                },
              ],
            },
            { description: 'final', cpu_nanos: 1000000, operators: [] },
          ],
        },
      },
      40
    );
    expect(summary).toMatchObject({
      cpuMs: 31,
      drivers: { data: 2, final: 1 },
      documentsFound: 12,
      valuesLoaded: 4,
    });
    expect(summary.topOperators).toEqual([
      { operator: 'LuceneSourceOperator', ms: 3 },
      { operator: 'EvalOperator', ms: 3 },
    ]);
  });

  it('prefers response counters, including zero, and tolerates malformed profile entries', () => {
    const response = {
      columns: [],
      values: [],
      documents_found: 0,
      values_loaded: 12,
      profile: {
        drivers: [
          false,
          {
            cpu_nanos: 'invalid',
            operators: [
              null,
              { operator: 'EvalOperator', status: { documents_found: 30, values_loaded: 3 } },
              { status: 'invalid' },
            ],
          },
        ],
      },
    };
    expect(summarizeEsqlPage(response, 10)).toMatchObject({
      documentsFound: 0,
      valuesLoaded: 12,
      cpuMs: 0,
      drivers: { unknown: 1 },
      topOperators: [
        { operator: 'EvalOperator', ms: 0 },
        { operator: 'unknown', ms: 0 },
      ],
    });
  });
});
