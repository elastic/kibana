/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useHeaderData } from './use_header_data';

const buildHit = (flattened: Record<string, unknown>): DataTableRecord => ({
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts', _source: {} },
  flattened,
});

describe('useHeaderData', () => {
  it('returns correct header data with single values', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.title': 'Test Attack',
      '@timestamp': '2025-12-16T12:00:00Z',
      'kibana.alert.attack_discovery.alert_ids': 'alert-1',
      'kibana.alert.attack_discovery.replacements': { key: 'value' },
      [ALERT_WORKFLOW_ASSIGNEE_IDS]: ['user-1'],
    });

    const { result } = renderHook(() => useHeaderData(hit));

    expect(result.current.title).toBe('Test Attack');
    expect(result.current.timestamp).toBe('2025-12-16T12:00:00Z');
    expect(result.current.alertIds).toEqual(['alert-1']);
    expect(result.current.alertsCount).toBe(1);
    expect(result.current.replacements).toEqual({ key: 'value' });
    expect(result.current.assignees).toEqual(['user-1']);
  });

  it('normalizes alertIds array correctly', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
    });

    const { result } = renderHook(() => useHeaderData(hit));

    expect(result.current.alertIds).toEqual(['alert-1', 'alert-2']);
    expect(result.current.alertsCount).toBe(2);
  });

  it('returns empty replacements when field is missing or string/array', () => {
    const hit = buildHit({});

    const { result } = renderHook(() => useHeaderData(hit));
    expect(result.current.replacements).toEqual({});
  });

  it('returns empty alertIds when value is null or undefined', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.alert_ids': null,
    });

    const { result } = renderHook(() => useHeaderData(hit));
    expect(result.current.alertIds).toEqual([]);
    expect(result.current.alertsCount).toBe(0);
  });

  it('returns assignees from ALERT_WORKFLOW_ASSIGNEE_IDS normalized to string array', () => {
    const hit = buildHit({
      [ALERT_WORKFLOW_ASSIGNEE_IDS]: ['uid-1', 'uid-2'],
    });

    const { result } = renderHook(() => useHeaderData(hit));

    expect(result.current.assignees).toEqual(['uid-1', 'uid-2']);
  });

  it('normalizes single assignee string to array', () => {
    const hit = buildHit({
      [ALERT_WORKFLOW_ASSIGNEE_IDS]: 'single-uid',
    });

    const { result } = renderHook(() => useHeaderData(hit));

    expect(result.current.assignees).toEqual(['single-uid']);
  });

  it('returns empty assignees when field is null or undefined', () => {
    const hit = buildHit({});

    const { result } = renderHook(() => useHeaderData(hit));

    expect(result.current.assignees).toEqual([]);
  });
});
