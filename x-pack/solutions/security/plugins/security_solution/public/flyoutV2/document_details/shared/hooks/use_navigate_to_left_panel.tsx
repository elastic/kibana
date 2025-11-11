/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/flyout';
import { useFlyoutApi } from '@kbn/flyout';
import {
  DocumentDetailsLeftPanelKeyV2,
  DocumentDetailsRightPanelKeyV2,
} from '../constants/panel_keys';
import { useDocumentDetailsContext } from '../context';

export interface UseNavigateToLeftPanelParams {
  /**
   * The tab to navigate to
   */
  tab: string;
  /**
   * Optional sub tab to navigate to
   */
  subTab?: string;
}

/**
 * Hook that returns the a callback to navigate to the analyzer in the flyout
 */
export const useNavigateToLeftPanel = ({
  tab,
  subTab,
}: UseNavigateToLeftPanelParams): (() => void) => {
  const { openFlyout, openChildPanel } = useFlyoutApi();
  const { eventId, indexName, scopeId, isPreviewMode } = useDocumentDetailsContext();

  const right: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsRightPanelKeyV2,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const left: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsLeftPanelKeyV2,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
      path: {
        tab,
        subTab,
      },
    }),
    [eventId, indexName, scopeId, tab, subTab]
  );

  return useCallback(() => {
    if (!isPreviewMode) {
      openChildPanel(left, 'm');
    } else {
      openFlyout(
        {
          main: right,
          child: left,
        },
        { mainSize: 's', childSize: 'm' }
      );
    }
  }, [isPreviewMode, openChildPanel, left, right, openFlyout]);
};
