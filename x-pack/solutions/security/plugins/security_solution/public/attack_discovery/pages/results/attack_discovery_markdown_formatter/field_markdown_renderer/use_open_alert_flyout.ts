/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry/events/flyout_v2/types';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { useMarkdownFormatterContext } from '../context';

/** The index pattern used for security alerts. */
const ALERTS_INDEX_PATTERN = `${DEFAULT_ALERTS_INDEX}-*` as const;

/**
 * Returns a stable callback that opens an alert-details flyout for the given alert `_id`.
 *
 * - New flyout path: opens as a **child** of the currently open flyout (using
 *   `openDocumentFlyoutFromPatternAsChild`) so the Back button returns to the attack flyout. The
 *   call gracefully degrades to a top-level flyout when no session is active (e.g. the attack
 *   discovery page).
 * - Legacy path: delegates to `openFlyout` from the expandable-flyout API.
 *
 * Reads `scopeId` from the nearest `MarkdownFormatterContext`.
 */
export const useOpenAlertFlyout = (): ((alertId: string) => void) => {
  const { scopeId } = useMarkdownFormatterContext();
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openDocumentFlyoutFromPatternAsChild } = useFlyoutApi();
  const { openFlyout } = useExpandableFlyoutApi();

  return useCallback(
    (alertId: string) => {
      if (enableNewFlyout) {
        openDocumentFlyoutFromPatternAsChild({
          documentId: alertId,
          indexName: ALERTS_INDEX_PATTERN,
          origin: FLYOUT_ORIGIN.ATTACK_SUMMARY_ALERT,
        });
      } else {
        openFlyout({
          right: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: alertId,
              indexName: ALERTS_INDEX_PATTERN,
              scopeId,
            },
          },
        });
      }
    },
    [enableNewFlyout, openDocumentFlyoutFromPatternAsChild, openFlyout, scopeId]
  );
};
