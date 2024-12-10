/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { Maybe } from '@kbn/timelines-plugin/common/search_strategy/common';
import { useKibana } from '../../../../common/lib/kibana';
import { SESSION_VIEW_ID } from '../../left/components/session_view';
import { DocumentDetailsLeftPanelKey, DocumentDetailsRightPanelKey } from '../constants/panel_keys';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';

export interface UseNavigateToSessionViewParams {
  /**
   * When flyout is already open, call open left panel only
   * When flyout is not open, open a new flyout
   */
  isFlyoutOpen: boolean;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Name of the index used in the parent's page
   */
  indexName: Maybe<string> | undefined;
  /**
   * Scope id of the page
   */
  scopeId: string;
}

export interface UseNavigateToSessionViewResult {
  /**
   * Callback to open session view in visualize tab
   */
  navigateToSessionView: () => void;
}

/**
 * Hook that returns the a callback to navigate to session view in the flyout
 */
export const useNavigateToSessionView = ({
  isFlyoutOpen,
  eventId,
  indexName,
  scopeId,
}: UseNavigateToSessionViewParams): UseNavigateToSessionViewResult => {
  const { telemetry } = useKibana().services;
  const { openLeftPanel, openFlyout } = useExpandableFlyoutApi();

  const right: FlyoutPanelProps = useMemo(
    () => ({
      id: DocumentDetailsRightPanelKey,
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
      id: DocumentDetailsLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
      path: {
        tab: 'visualize',
        subTab: SESSION_VIEW_ID,
      },
    }),
    [eventId, indexName, scopeId]
  );

  const navigateToSessionView = useCallback(() => {
    if (isFlyoutOpen) {
      openLeftPanel(left);
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutTabClicked, {
        location: scopeId,
        panel: 'left',
        tabId: 'visualize',
      });
    } else {
      openFlyout({
        right,
        left,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'left',
      });
    }
  }, [openFlyout, openLeftPanel, right, left, scopeId, telemetry, isFlyoutOpen]);

  return useMemo(() => ({ navigateToSessionView }), [navigateToSessionView]);
};
