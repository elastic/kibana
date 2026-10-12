/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { GraphTelemetryEvent } from '@kbn/cloud-security-posture-graph';
import { useKibana } from '../../../common/lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import type { GraphFlyoutVersion } from '../../../common/lib/telemetry';
import { GraphEventTypes, GRAPH_FLYOUT_VERSION } from '../../../common/lib/telemetry';

export interface UseGraphTelemetryResult {
  /** Pass to `GraphInvestigation`'s `onTelemetryEvent`. */
  onTelemetryEvent: (event: GraphTelemetryEvent) => void;
  /** Reports that the graph preview was expanded into the full graph. */
  reportPreviewExpanded: () => void;
}

/**
 * Maps graph package engagement events to EBT events, tagged with the flyout system in use.
 * Both the legacy flyout and flyout_v2 render the same graph components, so this is the only place
 * that knows which EBT event each graph event becomes.
 */
export const useGraphTelemetry = (): UseGraphTelemetryResult => {
  const { telemetry } = useKibana().services;
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const flyoutVersion: GraphFlyoutVersion = isNewFlyoutEnabled
    ? GRAPH_FLYOUT_VERSION.V2
    : GRAPH_FLYOUT_VERSION.LEGACY;

  const onTelemetryEvent = useCallback(
    (event: GraphTelemetryEvent) => {
      switch (event.type) {
        case 'node_action':
          telemetry?.reportEvent(GraphEventTypes.NodeActionClicked, {
            nodeType: event.nodeType,
            action: event.action,
            state: event.state,
            flyoutVersion,
          });
          break;
        case 'filter_changed':
          telemetry?.reportEvent(GraphEventTypes.FilterChanged, {
            change: event.change,
            flyoutVersion,
          });
          break;
        case 'search_submitted':
          telemetry?.reportEvent(GraphEventTypes.SearchSubmitted, {
            timeRangeChanged: event.timeRangeChanged,
            queryChanged: event.queryChanged,
            flyoutVersion,
          });
          break;
      }
    },
    [telemetry, flyoutVersion]
  );

  const reportPreviewExpanded = useCallback(() => {
    telemetry?.reportEvent(GraphEventTypes.PreviewExpanded, { flyoutVersion });
  }, [telemetry, flyoutVersion]);

  return useMemo(
    () => ({ onTelemetryEvent, reportPreviewExpanded }),
    [onTelemetryEvent, reportPreviewExpanded]
  );
};
