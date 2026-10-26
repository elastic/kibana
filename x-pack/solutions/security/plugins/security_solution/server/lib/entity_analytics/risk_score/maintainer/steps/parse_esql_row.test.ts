/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RIEMANN_ZETA_S_VALUE, getRiemannZetaValue } from '../../constants';
import { parseEsqlBaseScoreRow, parseEsqlResolutionScoreRow } from './parse_esql_row';

describe('parseEsqlResolutionScoreRow', () => {
  it('parses resolution row and filters self related entities', () => {
    const parseRow = parseEsqlResolutionScoreRow('.alerts-security.alerts-default', 500);
    const row = [
      2,
      100,
      [
        '{ "risk_score": "60", "time": "2026-01-01T00:00:00.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "VGVzdCBSdWxl", "category_b64": "c2lnbmFs", "id": "alert-1" }',
      ],
      ['user:alias-1|entity.relationships.resolution.resolved_to', 'user:target-1|self'],
      'user:target-1',
    ];

    const parsed = parseRow(row);

    expect(parsed.resolution_target_id).toBe('user:target-1');
    expect(parsed.alert_count).toBe(2);
    expect(parsed.score).toBe(100);
    expect(parsed.related_entities).toEqual([
      {
        entity_id: 'user:alias-1',
        relationship_type: 'entity.relationships.resolution.resolved_to',
      },
    ]);
  });
});

describe('normalization by sample size', () => {
  const index = '.alerts-security.alerts-default';
  const input =
    '{ "risk_score": "100", "time": "2026-01-01T00:00:00.000Z", "index": ".alerts-security.alerts-default", "rule_name_b64": "VGVzdCBSdWxl", "category_b64": "c2lnbmFs", "id": "alert-1" }';

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
      )([sampleSize, saturatedRaw(sampleSize), [input], 'host:h1']);

      expect(parsed.normalized_score).toBeCloseTo(100, 8);
    }
  );

  it('keeps an overridden sample size within 100 instead of using the default normalizer', () => {
    const raw = saturatedRaw(1_000);

    const followed = parseEsqlBaseScoreRow(index, 1_000)([1_000, raw, [input], 'host:h1']);
    const defaultNormalizer = raw / getRiemannZetaValue(500);

    expect(followed.normalized_score).toBeLessThanOrEqual(100.000000001);
    expect(defaultNormalizer).toBeGreaterThan(100);
  });

  it('scales risk input contributions by the same normalizer', () => {
    const parsed = parseEsqlBaseScoreRow(index, 1_000)([1, 100, [input], 'host:h1']);

    expect(parsed.risk_inputs[0].contribution).toBeCloseTo(100 / getRiemannZetaValue(1_000), 12);
  });
});
