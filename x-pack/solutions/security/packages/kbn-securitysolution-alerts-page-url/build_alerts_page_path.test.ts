/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { decode } from '@kbn/rison';
import { buildAlertsPagePath } from './build_alerts_page_path';

describe('buildAlertsPagePath', () => {
  it('keeps ids with reserved characters inside their own parameter', () => {
    const path = buildAlertsPagePath(['a&b', 'c#d', 'e+f'], '2026-09-01T00:00:00.000Z');

    const params = new URLSearchParams(path);
    expect([...params.keys()]).toHaveLength(3);
    expect(path).not.toMatch(/#/);
    expect(JSON.stringify(decode(params.get('filters') ?? ''))).toContain('e+f');
  });

  it('puts each alert id in the URL once, so a long batch stays within a byte budget', () => {
    const ids = Array.from({ length: 200 }, () => uuidv4());

    const path = buildAlertsPagePath(ids, '2026-09-01T00:00:00.000Z');

    const BYTES_PER_ID = 45;
    const FIXED_OVERHEAD_BYTES = 1500;
    expect(path.length).toBeLessThan(ids.length * BYTES_PER_ID + FIXED_OVERHEAD_BYTES);
  });

  it('round-trips the ids', () => {
    const path = buildAlertsPagePath(['a', 'b'], '2026-09-01T00:00:00.000Z');

    const [filter] = decode(new URLSearchParams(path).get('filters') ?? '') as Array<{
      query: { bool: { filter: { ids: { values: string[] } } } };
    }>;
    expect(filter.query.bool.filter.ids.values).toEqual(['a', 'b']);
  });
});
