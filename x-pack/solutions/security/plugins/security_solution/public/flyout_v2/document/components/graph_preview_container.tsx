/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBetaBadge, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { DataTableRecord } from '@kbn/discover-utils';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';

export interface GraphPreviewContainerProps {
  /**
   * DataTableRecord of the document for which the graph preview will be rendered
   */
  hit: DataTableRecord;
  /**
   * Callback when clicking on the header to show the full graph visualization.
   */
  onShowGraph: () => void;
  /**
   * Whether to show the icon in the header which indicates that the panel is clickable.
   */
  showIcon: boolean;
  /**
   * Whether to disable the navigation link in the header. This should be true when in rule
   * preview mode or when flyout expansion is not supported.
   */
  disableNavigation: boolean;
}

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities,
 * or an upsell message when the required license is not met.
 */
export const GraphPreviewContainer = memo(
  ({ hit, onShowGraph, showIcon, disableNavigation }: GraphPreviewContainerProps) => {
    const renderingId = useGeneratedHtmlId();

    const {
      eventIds,
      timestamp = new Date().toISOString(),
      shouldShowGraph,
      isAlert,
    } = useGraphPreview({ hit });

    // Show upsell when event has graph data but license is insufficient (ESS only)
    const GraphVisualizationUpsell = useUpsellingComponent('graph_visualization');

    // TODO: default start and end might not capture the original event
    const { isLoading, isError, data } = useFetchGraphData({
      req: {
        query: {
          originEventIds: eventIds.map((id) => ({ id, isAlert })),
          start: `${timestamp}||-30m`,
          end: `${timestamp}||+30m`,
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

    const iconType = useMemo(() => (showIcon ? 'arrowStart' : undefined), [showIcon]);
    const isNavigationEnabled = !disableNavigation && shouldShowGraph;

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
          iconType,
          ...(isNavigationEnabled && {
            link: {
              callback: onShowGraph,
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
        content={{
          paddingSize: 'none',
        }}
      >
        {shouldShowGraph ? (
          <GraphPreview isLoading={isLoading} isError={isError} data={data} />
        ) : (
          GraphVisualizationUpsell && <GraphVisualizationUpsell />
        )}
      </ExpandablePanel>
    );
  }
);

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
