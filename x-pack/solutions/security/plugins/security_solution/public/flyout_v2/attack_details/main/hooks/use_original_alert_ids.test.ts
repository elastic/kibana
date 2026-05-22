/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useOriginalAlertIds } from './use_original_alert_ids';

jest.mock('@kbn/elastic-assistant-common', () => ({
  getOriginalAlertIds: jest.fn(({ alertIds }: { alertIds: string[] }) => alertIds),
}));

const buildHit = (flattened: Record<string, unknown>): DataTableRecord => ({
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts', _source: {} },
  flattened,
});

describe('useOriginalAlertIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns original alert IDs from hit.flattened and applies getOriginalAlertIds', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.alert_ids': ['id1', 'id2'],
      'kibana.alert.attack_discovery.replacements': {},
    });

    const { result } = renderHook(() => useOriginalAlertIds(hit));

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['id1', 'id2'],
      replacements: {},
    });
    expect(result.current).toEqual(['id1', 'id2']);
  });

  it('normalizes single string alert ID to array', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.alert_ids': 'single-id',
      'kibana.alert.attack_discovery.replacements': {},
    });

    const { result } = renderHook(() => useOriginalAlertIds(hit));

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['single-id'],
      replacements: {},
    });
    expect(result.current).toEqual(['single-id']);
  });

  it('uses empty replacements when value is invalid', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.alert_ids': ['id1'],
      'kibana.alert.attack_discovery.replacements': null,
    });

    renderHook(() => useOriginalAlertIds(hit));

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['id1'],
      replacements: {},
    });
  });

  it('passes replacements object when value is a record', () => {
    const replacements = { 'uuid-1': 'real-id-1' };
    const hit = buildHit({
      'kibana.alert.attack_discovery.alert_ids': ['uuid-1'],
      'kibana.alert.attack_discovery.replacements': replacements,
    });

    const mockGetOriginalAlertIds = jest.mocked(getOriginalAlertIds);
    mockGetOriginalAlertIds.mockReturnValue(['real-id-1']);

    const { result } = renderHook(() => useOriginalAlertIds(hit));

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['uuid-1'],
      replacements,
    });
    expect(result.current).toEqual(['real-id-1']);
  });
});
