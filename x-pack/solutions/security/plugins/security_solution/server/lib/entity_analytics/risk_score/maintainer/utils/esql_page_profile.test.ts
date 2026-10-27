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
});
