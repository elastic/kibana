/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { EMPTY, switchMap } from 'rxjs';
import { isToolUiEvent } from '@kbn/agent-builder-common';
import { useKibana } from '../../common/lib/kibana';
import {
  ASSET_CRITICALITY_UPDATED_TOOL_EVENT,
  type AssetCriticalityUpdatedToolEventData,
} from '../../../common/entity_analytics/tool_events';

/**
 * Subscribes to agent builder tool events and calls `callback` when the
 * set_asset_criticality tool completes in the active conversation.
 */
export const useOnAssetCriticalityToolEvent = (
  callback: (data: AssetCriticalityUpdatedToolEventData) => void
): void => {
  const { agentBuilder } = useKibana().services;

  // Keep ref current after each render so the subscription never needs to
  // re-run just because the callback changed. useLayoutEffect (not direct
  // assignment) is safe for concurrent mode.
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!agentBuilder?.events) return;

    const subscription = agentBuilder.events.ui.activeConversation$
      .pipe(
        switchMap((active) => (active?.id ? agentBuilder.events.getChatEvents$(active.id) : EMPTY))
      )
      .subscribe((event) => {
        if (
          isToolUiEvent<
            typeof ASSET_CRITICALITY_UPDATED_TOOL_EVENT,
            AssetCriticalityUpdatedToolEventData
          >(event, ASSET_CRITICALITY_UPDATED_TOOL_EVENT)
        ) {
          callbackRef.current(event.data.data);
        }
      });

    return () => subscription.unsubscribe();
  }, [agentBuilder]);
};
