/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { batchNote, buildBatchSection, fitTokens } from './report_batches';

const promptOf = (count: number, prefix: string = 'a') =>
  `Classify. The format is <alert id="..."> for each:\n${Array.from(
    { length: count },
    (_, i) => `<alert id="${prefix}${i}">x</alert>`
  ).join('\n')}`;

const call = (count: number, inputTokens?: number, status: string = 'completed') => ({
  status,
  prompt: promptOf(count),
  inputTokens,
});

describe('buildBatchSection', () => {
  // Sizes 1, 2, 10, 30: cost units 6 + 7 + 15 + 35 = 63, overhead 4 * 5 = 20.
  const section = buildBatchSection([
    call(1),
    call(2),
    call(10),
    call(30),
    call(50, undefined, 'failed'),
  ]);

  it('counts only completed calls, because a failed call bought no verdict', () => {
    expect(section.calls).toBe(4);
    expect(section.alerts).toBe(43);
  });

  it('gives the overhead share of the cost units, the number that fuller batches lower', () => {
    expect(section.costUnits).toBe(63);
    expect(section.overheadUnits).toBe(20);
    expect(section.overheadShare).toBeCloseTo(20 / 63, 4);
  });

  it('puts the cost of calls with 1 to 5 alerts in its own bucket, the go or no-go number of the plan', () => {
    expect(section.bySize['1-5']).toEqual({
      calls: 2,
      alerts: 3,
      costUnits: 13,
      shareOfCost: Number((13 / 63).toFixed(4)),
    });
    expect(section.bySize['21-50'].calls).toBe(1);
  });

  it('gives the spread of the sizes by nearest rank', () => {
    expect(section.size).toEqual({ p10: 1, p50: 2, p90: 30, mean: 10.8, max: 30 });
  });

  it('does not count the format example of the prompt as an alert', () => {
    expect(buildBatchSection([call(3)]).alerts).toBe(3);
  });

  it('leaves the token fit out when the calls carry no tokens', () => {
    expect(section.tokenFit).toBeNull();
  });

  it('writes a ledger sentence with the overhead and the small-call share', () => {
    expect(batchNote(section)).toBe(
      'Batches: 4 calls, median 2 alerts, overhead 31.7% of the cost units, calls of 1 to 5 alerts 20.6% of the cost units.'
    );
  });
});

describe('fitTokens', () => {
  it('splits the input tokens into a fixed part per call and a part per alert', () => {
    // 3,000 fixed tokens and 400 per alert, exactly.
    const fit = fitTokens(
      [1, 10, 20, 50].map((alerts) => ({ alerts, tokens: 3000 + 400 * alerts }))
    );
    expect(fit).toMatchObject({ calls: 4, fixedPerCall: 3000, perAlert: 400, r2: 1 });
    // fixed 4 * 3,000 = 12,000 of 12,000 + 400 * 81 = 44,400
    expect(fit?.fixedShareOfInput).toBeCloseTo(12000 / 44400, 4);
  });

  it('gives no fit with fewer than 3 calls or with calls of one size, because the split is then not defined', () => {
    expect(
      fitTokens([
        { alerts: 1, tokens: 10 },
        { alerts: 2, tokens: 20 },
      ])
    ).toBeNull();
    expect(fitTokens([10, 10, 10].map((alerts) => ({ alerts, tokens: 5000 })))).toBeNull();
  });

  it('is used by the section only for calls that report tokens', () => {
    const fit = buildBatchSection([
      call(1, 3400),
      call(10, 7000),
      call(20, 11000),
      call(5),
    ]).tokenFit;
    expect(fit?.calls).toBe(3);
    expect(fit?.perAlert).toBe(400);
  });
});
