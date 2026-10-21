/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlBaseScoreRow, parseEsqlResolutionScoreRow } from './parse_esql_row';

describe('parseEsqlBaseScoreRow', () => {
  const parseRow = parseEsqlBaseScoreRow('.alerts-security.alerts-default');
  const input = '{ "risk_score": "60", "time": "2026-01-01T00:00:00.000Z", "id": "alert-1" }';

  it('reads the entity id after the alert sources column', () => {
    const parsed = parseRow([10, 100, input, ['9:okta', '1:azure'], 'user:a@okta']);

    expect(parsed.entity_id).toBe('user:a@okta');
    expect(parsed.alert_count).toBe(10);
    expect(parsed.alert_sources).toEqual([
      { source: 'okta', alerts: 9 },
      { source: 'azure', alerts: 1 },
    ]);
  });

  it('wraps a single source and drops null sources', () => {
    expect(parseRow([1, 10, input, '1:okta', 'user:a@okta']).alert_sources).toEqual([
      { source: 'okta', alerts: 1 },
    ]);
    expect(parseRow([1, 10, input, null, 'user:a@okta']).alert_sources).toEqual([]);
  });

  it('splits on the first colon, so sources can contain colons', () => {
    expect(parseRow([3, 10, input, '3:custom:source', 'user:a@okta']).alert_sources).toEqual([
      { source: 'custom:source', alerts: 3 },
    ]);
  });

  it('drops values without a count', () => {
    expect(parseRow([1, 10, input, ['okta', ':okta', 'x:okta'], 'user:a']).alert_sources).toEqual(
      []
    );
  });
});

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
