/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlResolutionScoreRow } from './parse_esql_row';

describe('parseEsqlResolutionScoreRow', () => {
  it('parses resolution row and filters self related entities', () => {
    const parseRow = parseEsqlResolutionScoreRow('.alerts-security.alerts-default');
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
