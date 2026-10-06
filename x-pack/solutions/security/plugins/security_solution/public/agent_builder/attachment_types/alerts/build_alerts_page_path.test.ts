/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
});
