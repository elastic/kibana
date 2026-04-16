/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBetaBadge, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { Maybe } from '@kbn/timelines-plugin/common/search_strategy/common';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';
import { ExpandablePanel } from '../../../flyout_v2/shared/components/expandable_panel';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { useShouldShowGraph } from '../hooks/use_should_show_graph';

/** Props for event/alert mode — derives graph data from the event document */
interface EventGraphPreviewContainerProps {
  mode: 'event';
  /** Whether the graph should be displayed */
  shouldShowGraph: boolean;
  /** Whether the source document is an alert or a regular event */
  isAlert: boolean;
  /** Timestamp of the source document */
  timestamp: string;
  /** Event/alert document ID */
  eventIds: string[];
  /** Index of the source document */
  indexName: Maybe<string> | undefined;
  /** Whether the flyout is in preview mode */
  isPreviewMode: boolean;
  /** Whether the flyout is in rule preview mode */
  isRulePreview: boolean;
  /** Optional callback to expand graph. When undefined, the expand arrow is hidden. */
  onExpandGraph?: () => void;
}

/** Props for entity mode — uses the entity ID directly as the graph actor */
interface EntityGraphPreviewContainerProps {
  mode: 'entity';
  /** Entity Store v2 entity ID (entity.id) */
  entityId: string;
  /** Whether the flyout is in preview mode */
  isPreviewMode: boolean;
  /** Whether the flyout is in rule preview mode */
  isRulePreview: boolean;
  /** Optional callback to expand graph. When undefined, the expand arrow is hidden. */
  onExpandGraph?: () => void;
}

export type SharedGraphPreviewContainerProps =
  | EventGraphPreviewContainerProps
  | EntityGraphPreviewContainerProps;

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities.
 * Supports two modes: 'event' (driven by alert/event document data) and 'entity' (driven by entity ID).
 */
export const GraphPreviewContainer: React.FC<SharedGraphPreviewContainerProps> = (props) => {
  const renderingId = useGeneratedHtmlId();
  const { isPreviewMode, isRulePreview, onExpandGraph } = props;
  const showExpandControl = !isPreviewMode && !isRulePreview && onExpandGraph != null;

  const eventMode = props.mode === 'event' ? props : null;
  const entityMode = props.mode === 'entity' ? props : null;
  const shouldShowEntityGraph = useShouldShowGraph() && props.mode === 'entity';

  const shouldShowGraph = shouldShowEntityGraph || eventMode?.shouldShowGraph;

  const { isLoading, isError, data } = useFetchGraphData({
    req: {
      query: {
        entityIds: entityMode?.entityId ? [{ id: entityMode.entityId, isOrigin: true }] : undefined,
        originEventIds: eventMode?.eventIds.map((id) => ({ id, isAlert: eventMode.isAlert })),
        start: props.mode === 'event' ? `${eventMode?.timestamp}||-30m` : 'now-30d',
        end: props.mode === 'event' ? `${eventMode?.timestamp}||+30m` : 'now',
      },
    },
    options: {
      enabled: shouldShowGraph,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    if (shouldShowGraph) {
      uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, GRAPH_PREVIEW);
    }
  }, [shouldShowGraph, renderingId]);

  // Show upsell when event has graph data but license is insufficient (ESS only)
  const GraphVisualizationUpsell = useUpsellingComponent('graph_visualization');

  // Nothing to render when graph is not available and there is no upsell
  if (!shouldShowGraph && !GraphVisualizationUpsell) {
    return null;
  }

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.visualizations.graphPreview.graphPreviewTitle"
            defaultMessage="Graph preview"
          />
        ),
        headerContent: (
          <EuiBetaBadge
            alignment="middle"
            iconType="beaker"
            data-test-subj="graphPreviewBetaBadge"
            label={i18n.translate(
              'xpack.securitySolution.flyout.right.visualizations.graphPreview.technicalPreviewLabel',
              {
                defaultMessage: 'Technical Preview',
              }
            )}
            tooltipContent={i18n.translate(
              'xpack.securitySolution.flyout.right.visualizations.graphPreview.technicalPreviewTooltip',
              {
                defaultMessage:
                  'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
              }
            )}
          />
        ),
        iconType: showExpandControl ? 'arrowStart' : undefined,
        ...(showExpandControl &&
          onExpandGraph != null && {
            link: {
              callback: onExpandGraph,
              tooltip: (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.visualizations.graphPreview.graphPreviewOpenGraphTooltip"
                  defaultMessage="Expand graph"
                />
              ),
            },
          }),
      }}
      data-test-subj={GRAPH_PREVIEW_TEST_ID}
      content={
        !isLoading && !isError
          ? {
              paddingSize: 'none',
            }
          : undefined
      }
    >
      {shouldShowGraph ? (
        <GraphPreview isLoading={isLoading} isError={isError} data={data} />
      ) : (
        GraphVisualizationUpsell && <GraphVisualizationUpsell />
      )}
    </ExpandablePanel>
  );
};

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
