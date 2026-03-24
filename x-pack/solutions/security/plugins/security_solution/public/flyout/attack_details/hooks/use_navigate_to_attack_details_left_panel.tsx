/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { AttackDetailsLeftPanelKey, AttackDetailsRightPanelKey } from '../constants/panel_keys';
import { INSIGHTS_TAB_ID, ENTITIES_TAB_ID } from '../constants/left_panel_paths';
import { useAttackDetailsContext } from '../context';

export interface UseNavigateToAttackDetailsLeftPanelParams {
  /**
   * Optional tab to open in the left panel. Defaults to the Insights tab.
   * Use 'notes' to open the Notes tab.
   */
  tab?: 'insights' | 'notes';
  /**
   * Optional sub-tab (e.g. 'entity' for Entities). When opening Insights, defaults to Entities.
   * Ignored when tab is 'notes'.
   */
  subTab?: string;
}

/**
 * Hook that returns a callback to open the Attack Details left panel.
 */
export const useNavigateToAttackDetailsLeftPanel = (
  params: UseNavigateToAttackDetailsLeftPanelParams = {}
): (() => void) => {
  const { tab = INSIGHTS_TAB_ID, subTab = ENTITIES_TAB_ID } = params;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();
  const { attackId, indexName, isPreviewMode } = useAttackDetailsContext();

  const left: FlyoutPanelProps = useMemo(
    () => ({
      id: AttackDetailsLeftPanelKey,
      params: {
        attackId,
        indexName,
      },
      path: {
        tab,
        ...(tab === INSIGHTS_TAB_ID ? { subTab } : {}),
      },
    }),
    [attackId, indexName, tab, subTab]
  );

  const right: FlyoutPanelProps = useMemo(
    () => ({
      id: AttackDetailsRightPanelKey,
      params: {
        attackId,
        indexName,
      },
    }),
    [attackId, indexName]
  );

  return useCallback(() => {
    if (isPreviewMode) {
      openFlyout({ right, left });
    } else {
      openLeftPanel(left);
    }
  }, [isPreviewMode, openFlyout, openLeftPanel, right, left]);
};
