/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';

import { ALERT_ATTACK_IDS } from '../../../../../../common/field_maps/field_names';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import type {
  UseShowRelatedAttacksParams,
  UseShowRelatedAttacksResult,
} from './use_show_related_attacks';
import { useShowRelatedAttacks } from './use_show_related_attacks';

jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockAlignmentEnabled = (enabled: boolean) => {
  (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
    (feature: string) => feature === 'enableAlertsAndAttacksAlignment' && enabled
  );
};

describe('useShowRelatedAttacks', () => {
  let hookResult: RenderHookResult<UseShowRelatedAttacksResult, UseShowRelatedAttacksParams>;

  beforeEach(() => {
    mockAlignmentEnabled(true);
  });

  it('should return true when alignment is enabled even if hit has no attack ids', () => {
    const hit = { flattened: {} } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({ show: true, attackIds: [] });
  });

  it('should return false if alignment is disabled, even when attack ids exist', () => {
    mockAlignmentEnabled(false);

    const hit = {
      flattened: { [ALERT_ATTACK_IDS]: ['attack-id-1', 'attack-id-2'] },
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({
      show: false,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });

  it('should return true if alignment is enabled and hit has attack ids', () => {
    const hit = {
      flattened: { [ALERT_ATTACK_IDS]: ['attack-id-1', 'attack-id-2'] },
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({
      show: true,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });

  it('should return true when alignment is enabled even if attack ids are empty', () => {
    const hit = { flattened: { [ALERT_ATTACK_IDS]: [] } } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({
      show: true,
      attackIds: [],
    });
  });
});
