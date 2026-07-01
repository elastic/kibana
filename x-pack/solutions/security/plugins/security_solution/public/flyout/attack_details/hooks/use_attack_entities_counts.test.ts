/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackEntitiesCounts } from './use_attack_entities_counts';
import { useOriginalAlertIds } from './use_original_alert_ids';
import { useAttackEntitiesCounts as useAttackEntitiesCountsV2 } from '../../../flyout_v2/attack/main/hooks/use_attack_entities_counts';

jest.mock('./use_original_alert_ids', () => ({
  useOriginalAlertIds: jest.fn(),
}));

jest.mock('../../../flyout_v2/attack/main/hooks/use_attack_entities_counts', () => ({
  useAttackEntitiesCounts: jest.fn(),
}));

describe('useAttackEntitiesCounts', () => {
  const mockUseOriginalAlertIds = jest.mocked(useOriginalAlertIds);
  const mockUseAttackEntitiesCountsV2 = jest.mocked(useAttackEntitiesCountsV2);

  const defaultResult = { relatedUsers: 0, relatedHosts: 0, loading: false, error: false };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOriginalAlertIds.mockReturnValue([]);
    mockUseAttackEntitiesCountsV2.mockReturnValue(defaultResult);
  });

  it('reads alert IDs from context and forwards them to the v2 hook', () => {
    mockUseOriginalAlertIds.mockReturnValue(['id1', 'id2']);

    renderHook(() => useAttackEntitiesCounts());

    expect(mockUseAttackEntitiesCountsV2).toHaveBeenCalledWith(['id1', 'id2']);
  });

  it('returns the result from the v2 hook unchanged', () => {
    mockUseOriginalAlertIds.mockReturnValue(['id1']);
    const v2Result = { relatedUsers: 3, relatedHosts: 5, loading: false, error: false };
    mockUseAttackEntitiesCountsV2.mockReturnValue(v2Result);

    const { result } = renderHook(() => useAttackEntitiesCounts());

    expect(result.current).toEqual(v2Result);
  });
});
