/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useNavigateToAttackDetailsLeftPanel } from './use_navigate_to_attack_details_left_panel';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useAttackDetailsContext } from '../context';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';

const mockOpenLeftPanel = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

describe('useNavigateToAttackDetailsLeftPanel', () => {
  const attackId = 'attack-1';
  const indexName = '.alerts-security.alerts-default';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      openLeftPanel: mockOpenLeftPanel,
      openFlyout: jest.fn(),
      openRightPanel: jest.fn(),
      openPreviewPanel: jest.fn(),
      closeRightPanel: jest.fn(),
      closePreviewPanel: jest.fn(),
      closeFlyout: jest.fn(),
      closeLeftPanel: jest.fn(),
    } as unknown as ReturnType<typeof useExpandableFlyoutApi>);
    jest.mocked(useAttackDetailsContext).mockReturnValue({
      attackId,
      indexName,
    } as ReturnType<typeof useAttackDetailsContext>);
  });

  it('returns a callback that opens the left panel with correct params and default tab', () => {
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
      },
    });
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
  });
});
