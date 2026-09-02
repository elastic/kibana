/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import {
  useAttackExploreInAttacksContextMenuItems,
  EXPLORE_IN_ATTACKS_TEST_ID,
} from './use_attack_explore_in_attacks_context_menu_items';
import { ATTACK_FLYOUT_V2_URL_PARAM } from '../../../../../flyout_v2/attack/main/utils/attack_flyout_v2_url_param';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';

const mockGetUrlForApp = jest.fn(
  (_appId: string, { path }: { path: string }) => `/app/securitySolutionUI/${path}`
);

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(() => ({
    services: { application: { getUrlForApp: mockGetUrlForApp } },
  })),
}));

jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: jest.fn().mockReturnValue(false),
}));

const createAttack = (overrides: Partial<AttackDiscoveryAlert> = {}): AttackDiscoveryAlert =>
  ({
    id: 'attack-123',
    timestamp: '2024-01-01T00:00:00.000Z',
    index: '.alerts-security.attack-discovery.alerts-default',
    ...overrides,
  } as AttackDiscoveryAlert);

describe('useAttackExploreInAttacksContextMenuItems', () => {
  const closePopover = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns one item', () => {
    const { result } = renderHook(() =>
      useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
    );
    expect(result.current.items).toHaveLength(1);
  });

  it('item has the correct data-test-subj', () => {
    const { result } = renderHook(() =>
      useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
    );
    expect(result.current.items[0]['data-test-subj']).toBe(EXPLORE_IN_ATTACKS_TEST_ID);
  });

  it('label shows "Explore in Attacks"', () => {
    const { result } = renderHook(() =>
      useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
    );
    const { getByText } = render(result.current.items[0].name as React.ReactElement);
    expect(getByText('Explore in Attacks')).toBeInTheDocument();
  });

  describe('onClick', () => {
    it('calls closePopover', () => {
      const { result } = renderHook(() =>
        useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
      );
      (result.current.items[0].onClick as () => void)();
      expect(closePopover).toHaveBeenCalledTimes(1);
    });

    it('opens a new tab with noopener,noreferrer', () => {
      const { result } = renderHook(() =>
        useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
      );
      (result.current.items[0].onClick as () => void)();
      expect(window.open).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener,noreferrer');
    });

    it('builds URL pointing to attacks page', () => {
      const { result } = renderHook(() =>
        useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
      );
      (result.current.items[0].onClick as () => void)();
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('/app/securitySolutionUI/attacks'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('includes the attack id in the URL', () => {
      const { result } = renderHook(() =>
        useAttackExploreInAttacksContextMenuItems({
          attack: createAttack({ id: 'my-attack-id' }),
          closePopover,
        })
      );
      (result.current.items[0].onClick as () => void)();
      const calledUrl = (window.open as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('my-attack-id');
    });

    it('encodes the legacy flyout URL state when v2 is disabled', () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
      const { result } = renderHook(() =>
        useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
      );
      (result.current.items[0].onClick as () => void)();
      const calledUrl = (window.open as jest.Mock).mock.calls[0][0] as string;
      const params = new URLSearchParams(calledUrl.split('?')[1]);
      expect(params.get('flyout')).not.toBeNull();
      expect(params.get(ATTACK_FLYOUT_V2_URL_PARAM)).toBeNull();
    });

    it('encodes the v2 attack flyout URL param when v2 is enabled', () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);
      const { result } = renderHook(() =>
        useAttackExploreInAttacksContextMenuItems({ attack: createAttack(), closePopover })
      );
      (result.current.items[0].onClick as () => void)();
      const calledUrl = (window.open as jest.Mock).mock.calls[0][0] as string;
      const params = new URLSearchParams(calledUrl.split('?')[1]);
      expect(params.get(ATTACK_FLYOUT_V2_URL_PARAM)).not.toBeNull();
      expect(params.get('flyout')).toBeNull();
    });
  });

  it('does not throw when closePopover is undefined', () => {
    const { result } = renderHook(() =>
      useAttackExploreInAttacksContextMenuItems({ attack: createAttack() })
    );
    expect(() => (result.current.items[0].onClick as () => void)()).not.toThrow();
  });
});
