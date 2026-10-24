/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RIEMANN_ZETA_S_VALUE, getRiemannZetaValue } from '../../constants';
import { parseEsqlBaseScoreRow, parseEsqlResolutionScoreRow } from './parse_esql_row';

const index = '.alerts-security.alerts-default';
const input = (score: string, id: string, ruleName = 'Test Rule') =>
  `${score}|2026-01-01T00:00:00.000Z|${id}|${ruleName}`;

describe('parseEsqlBaseScoreRow', () => {
  const parseRow = parseEsqlBaseScoreRow(index, 500);
  const zeta = getRiemannZetaValue(500);

  it('reads each input and weights it by its position', () => {
    const parsed = parseRow([
      2,
      150,
      [input('100.0', 'alert-1'), input('50.0', 'alert-2')],
      'host:h1',
    ]);

    expect(parsed).toEqual({
      entity_id: 'host:h1',
      alert_count: 2,
      score: 150,
      normalized_score: 150 / zeta,
      risk_inputs: [
        {
          id: 'alert-1',
          time: '2026-01-01T00:00:00.000Z',
          index,
          rule_name: 'Test Rule',
          score: 100,
          contribution: 100 / 1 / zeta,
        },
        {
          id: 'alert-2',
          time: '2026-01-01T00:00:00.000Z',
          index,
          rule_name: 'Test Rule',
          score: 50,
          contribution: 50 / Math.pow(2, RIEMANN_ZETA_S_VALUE) / zeta,
        },
      ],
    });
  });

  it('keeps a rule name that contains the separator whole', () => {
    const [riskInput] = parseRow([
      1,
      60,
      input('60.0', 'alert-1', 'Rule | with | pipes'),
      'host:h1',
    ]).risk_inputs;

    expect(riskInput.rule_name).toBe('Rule | with | pipes');
    expect(riskInput.id).toBe('alert-1');
  });

  it('reads a single input that comes back as a string', () => {
    expect(parseRow([1, 60, input('60.0', 'alert-1'), 'host:h1']).risk_inputs).toHaveLength(1);
  });

  it("skips malformed inputs and keeps the others' position weights", () => {
    const parsed = parseRow([
      3,
      100,
      ['not an input', null, input('40.0', 'alert-3'), input('oops', 'alert-4'), '40.0|t||Rule'],
      'host:h1',
    ]);

    expect(parsed.risk_inputs).toEqual([
      expect.objectContaining({
        id: 'alert-3',
        contribution: 40 / Math.pow(3, RIEMANN_ZETA_S_VALUE) / zeta,
      }),
    ]);
  });

  it('leaves an empty rule name undefined', () => {
    const [riskInput] = parseRow([1, 60, input('60.0', 'alert-1', ''), 'host:h1']).risk_inputs;

    expect(riskInput.rule_name).toBeUndefined();
  });

  it('returns no inputs when every input is null', () => {
    expect(parseRow([1, 60, null, 'host:h1']).risk_inputs).toEqual([]);
  });
});

describe('parseEsqlResolutionScoreRow', () => {
  it('parses resolution row and filters self related entities', () => {
    const parseRow = parseEsqlResolutionScoreRow(index, 500);
    const row = [
      2,
      100,
      [input('60.0', 'alert-1')],
      ['user:alias-1|entity.relationships.resolution.resolved_to', 'user:target-1|self'],
      'user:target-1',
    ];

    const parsed = parseRow(row);

    expect(parsed.resolution_target_id).toBe('user:target-1');
    expect(parsed.alert_count).toBe(2);
    expect(parsed.score).toBe(100);
    expect(parsed.risk_inputs).toEqual([
      expect.objectContaining({ id: 'alert-1', score: 60, rule_name: 'Test Rule' }),
    ]);
    expect(parsed.related_entities).toEqual([
      {
        entity_id: 'user:alias-1',
        relationship_type: 'entity.relationships.resolution.resolved_to',
      },
    ]);
  });

  it('skips the score key of a pre-aggregated input', () => {
    const parseRow = parseEsqlResolutionScoreRow(index, 500, { sortKeyed: true });
    const row = [
      1,
      60,
      `0000060000|${input('60.0', 'alert-1')}`,
      'user:target-1|self',
      'user:target-1',
    ];

    expect(parseRow(row).risk_inputs).toEqual([
      {
        id: 'alert-1',
        time: '2026-01-01T00:00:00.000Z',
        index,
        rule_name: 'Test Rule',
        score: 60,
        contribution: 60 / getRiemannZetaValue(500),
      },
    ]);
  });

  it('skips related entities without an ID or a relationship', () => {
    const parseRow = parseEsqlResolutionScoreRow(index, 500);

    expect(
      parseRow([1, 60, [], ['user:alias-1', '|resolved_to', 'user:alias-2|'], 'user:target-1'])
        .related_entities
    ).toEqual([]);
  });
});

describe('normalization by sample size', () => {
  const maxInput = input('100.0', 'alert-1');

  const saturatedRaw = (sampleSize: number) => {
    let raw = 0;
    for (let rank = 1; rank <= sampleSize; rank++) {
      raw += 100 / rank ** RIEMANN_ZETA_S_VALUE;
    }
    return raw;
  };

  it.each([100, 500, 1_000, 5_000])(
    'normalizes a saturated sample of %d alerts to 100',
    (sampleSize) => {
      const parsed = parseEsqlBaseScoreRow(
        index,
        sampleSize
      )([sampleSize, saturatedRaw(sampleSize), [maxInput], 'host:h1']);

      expect(parsed.normalized_score).toBeCloseTo(100, 8);
    }
  );

  it('keeps an overridden sample size within 100 instead of using the default normalizer', () => {
    const raw = saturatedRaw(1_000);

    const followed = parseEsqlBaseScoreRow(index, 1_000)([1_000, raw, [maxInput], 'host:h1']);
    const defaultNormalizer = raw / getRiemannZetaValue(500);

    expect(followed.normalized_score).toBeLessThanOrEqual(100.000000001);
    expect(defaultNormalizer).toBeGreaterThan(100);
  });

  it('scales risk input contributions by the same normalizer', () => {
    const parsed = parseEsqlBaseScoreRow(index, 1_000)([1, 100, [maxInput], 'host:h1']);

    expect(parsed.risk_inputs[0].contribution).toBeCloseTo(100 / getRiemannZetaValue(1_000), 12);
  });
});
