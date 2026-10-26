/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { GraphTelemetryEvent } from '@kbn/cloud-security-posture-graph';
import { useKibana } from '../../../common/lib/kibana';
import { GraphEventTypes } from '../../../common/lib/telemetry';

export interface UseGraphTelemetryResult {
  /** Pass to `GraphInvestigation`'s `onTelemetryEvent`. */
  onTelemetryEvent: (event: GraphTelemetryEvent) => void;
  /** Reports that the graph preview was expanded into the full graph. */
  reportPreviewExpanded: () => void;
}

/**
 * Maps graph package engagement events to EBT events. The legacy flyout and flyout_v2 render the
 * same graph components, so this is the only place that knows which EBT event each one becomes.
 */
export const useGraphTelemetry = (): UseGraphTelemetryResult => {
  const { telemetry } = useKibana().services;

  const onTelemetryEvent = useCallback(
    (event: GraphTelemetryEvent) => {
      switch (event.type) {
        case 'node_action':
          telemetry?.reportEvent(GraphEventTypes.NodeActionClicked, {
            nodeType: event.nodeType,
            action: event.action,
            state: event.state,
          });
          break;
        case 'filter_changed':
          telemetry?.reportEvent(GraphEventTypes.FilterChanged, {
            change: event.change,
          });
          break;
        case 'search_submitted':
          telemetry?.reportEvent(GraphEventTypes.SearchSubmitted, {
            timeRangeChanged: event.timeRangeChanged,
            queryChanged: event.queryChanged,
          });
          break;
      }
    },
    [telemetry]
  );

  const reportPreviewExpanded = useCallback(() => {
    telemetry?.reportEvent(GraphEventTypes.PreviewExpanded, {});
  }, [telemetry]);

  return useMemo(
    () => ({ onTelemetryEvent, reportPreviewExpanded }),
    [onTelemetryEvent, reportPreviewExpanded]
  );
};
