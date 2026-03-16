/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';
import { useAttackDetailsContext } from '../context';

const INSIGHTS_TAB_ID = 'insights' as const;
const ENTITIES_SUB_TAB_ID = 'entity' as const;

export interface UseNavigateToAttackDetailsLeftPanelParams {
  /**
   * Optional tab to open in the left panel. Defaults to the Insights tab.
   */
  tab?: string;
  /**
   * Optional sub-tab (e.g. 'entity' for Entities). When opening Insights, defaults to Entities.
   */
  subTab?: string;
}

/**
 * Hook that returns a callback to open the Attack Details left panel.
 */
export const useNavigateToAttackDetailsLeftPanel = (
  params: UseNavigateToAttackDetailsLeftPanelParams = {}
): (() => void) => {
  const { tab = INSIGHTS_TAB_ID, subTab = ENTITIES_SUB_TAB_ID } = params;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { attackId, indexName } = useAttackDetailsContext();

  const left: FlyoutPanelProps = useMemo(
    () => ({
      id: AttackDetailsLeftPanelKey,
      params: {
        attackId,
        indexName,
      },
      path: {
        tab,
        subTab,
      },
    }),
    [attackId, indexName, tab, subTab]
  );

  return useCallback(() => {
    openLeftPanel(left);
  }, [openLeftPanel, left]);
};
