/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useNavigateToAttackDetailsLeftPanel } from './use_navigate_to_attack_details_left_panel';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useAttackDetailsContext } from '../context';
import { AttackDetailsLeftPanelKey, AttackDetailsRightPanelKey } from '../constants/panel_keys';

const mockOpenLeftPanel = vi.fn();
const mockOpenFlyout = vi.fn();

vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../context', () => {
  const mocked = {
    useAttackDetailsContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useNavigateToAttackDetailsLeftPanel', () => {
  const attackId = 'attack-1';
  const indexName = '.alerts-security.alerts-default';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExpandableFlyoutApi).mockReturnValue({
      openLeftPanel: mockOpenLeftPanel,
      openFlyout: mockOpenFlyout,
      openRightPanel: vi.fn(),
      openPreviewPanel: vi.fn(),
      closeRightPanel: vi.fn(),
      closePreviewPanel: vi.fn(),
      closeFlyout: vi.fn(),
      closeLeftPanel: vi.fn(),
    } as unknown as ReturnType<typeof useExpandableFlyoutApi>);
    vi.mocked(useAttackDetailsContext).mockReturnValue({
      attackId,
      indexName,
      isPreviewMode: false,
    } as ReturnType<typeof useAttackDetailsContext>);
  });

  it('returns a callback that opens the left panel with correct params and default tab and subTab', () => {
    const { result } = renderHook(() => useNavigateToAttackDetailsLeftPanel());

    result.current();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: AttackDetailsLeftPanelKey,
      params: {
        attackId,
        indexName,
      },
      path: {
        tab: 'insights',
        subTab: 'entity',
      },
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });

  it('returns a callback that opens the left panel with custom tab when provided', () => {
    const { result } = renderHook(() => useNavigateToAttackDetailsLeftPanel({ tab: 'notes' }));

    result.current();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: AttackDetailsLeftPanelKey,
      params: {
        attackId,
        indexName,
      },
      path: {
        tab: 'notes',
      },
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });

  it('returns a callback that opens a full flyout when in preview mode', () => {
    vi.mocked(useAttackDetailsContext).mockReturnValue({
      attackId,
      indexName,
      isPreviewMode: true,
    } as ReturnType<typeof useAttackDetailsContext>);

    const { result } = renderHook(() => useNavigateToAttackDetailsLeftPanel());

    result.current();

    expect(mockOpenLeftPanel).not.toHaveBeenCalled();
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: AttackDetailsRightPanelKey,
        params: {
          attackId,
          indexName,
        },
      },
      left: {
        id: AttackDetailsLeftPanelKey,
        params: {
          attackId,
          indexName,
        },
        path: {
          tab: 'insights',
          subTab: 'entity',
        },
      },
    });
  });

  it('returns a callback that opens the left panel with correlation subTab when provided', () => {
    const { result } = renderHook(() =>
      useNavigateToAttackDetailsLeftPanel({ subTab: 'correlation' })
    );

    result.current();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: AttackDetailsLeftPanelKey,
      params: {
        attackId,
        indexName,
      },
      path: {
        tab: 'insights',
        subTab: 'correlation',
      },
    });
  });
});
