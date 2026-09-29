/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';

import { ALERT_ATTACK_IDS } from '../../../../../../common/field_maps/field_names';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../../../../../common/hooks/use_is_alerts_and_attacks_alignment_enabled';
import type {
  UseShowRelatedAttacksParams,
  UseShowRelatedAttacksResult,
} from './use_show_related_attacks';
import { useShowRelatedAttacks } from './use_show_related_attacks';

vi.mock('../../../../../common/hooks/use_is_alerts_and_attacks_alignment_enabled', () => {
  const mocked = {
    useIsAlertsAndAttacksAlignmentEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useShowRelatedAttacks', () => {
  let hookResult: RenderHookResult<UseShowRelatedAttacksResult, UseShowRelatedAttacksParams>;

  beforeEach(() => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(true);
  });

  it('should return true when setting is enabled even if hit has no attack ids', () => {
    const hit = { flattened: {} } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({ show: true, attackIds: [] });
  });

  it('should return false if setting is disabled, even when attack ids exist', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(false);

    const hit = {
      flattened: { [ALERT_ATTACK_IDS]: ['attack-id-1', 'attack-id-2'] },
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({
      show: false,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });

  it('should return true if setting is enabled and hit has attack ids', () => {
    const hit = {
      flattened: { [ALERT_ATTACK_IDS]: ['attack-id-1', 'attack-id-2'] },
    } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({
      show: true,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });

  it('should return true when setting is enabled even if attack ids are empty', () => {
    const hit = { flattened: { [ALERT_ATTACK_IDS]: [] } } as unknown as DataTableRecord;
    hookResult = renderHook(() => useShowRelatedAttacks({ hit }));

    expect(hookResult.result.current).toEqual({
      show: true,
      attackIds: [],
    });
  });
});
