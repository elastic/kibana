/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getFieldValue, type DataTableRecord } from '@kbn/discover-utils';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { GraphPreview } from '../../shared/components/graph_preview';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID, GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { EventKind } from '../constants/event_kinds';

export interface GraphPreviewContainerProps {
  /**
   * Document to render the graph preview for.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked when the user expands the preview into the Graph tools flyout.
   * When omitted, no expand link is shown.
   */
  onShowGraph?: () => void;
  /**
   * Whether to show the header icon indicating that the panel is clickable.
   */
  showIcon: boolean;
  /**
   * Whether to disable the navigation link in the header. Set when in rule preview
   * mode, when flyout expansion is not supported, or when no destination exists yet.
   */
  disableNavigation: boolean;
}

/**
 * Graph preview under Overview, Visualizations. Shows a non-interactive graph
 * representation, or an upsell when the required license is not met.
 */
export const GraphPreviewContainer = memo(
  ({ hit, onShowGraph, showIcon, disableNavigation }: GraphPreviewContainerProps) => {
    const { eventIds, timestamp, shouldShowGraph } = useGraphPreview({ hit });
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    const GraphVisualizationUpsell = useUpsellingComponent('graph_visualization');

    const { isLoading, isError, data } = useFetchGraphData({
      req: {
        query: {
          originEventIds: eventIds.map((id) => ({ id, isAlert })),
          start: `${timestamp ?? new Date().toISOString()}||-30m`,
          end: `${timestamp ?? new Date().toISOString()}||+30m`,
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
    }, [shouldShowGraph]);

    if (!shouldShowGraph && !GraphVisualizationUpsell) {
      return null;
    }

    const showLink = !disableNavigation && shouldShowGraph && onShowGraph != null;

    return (
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.document.visualizations.graphPreview.graphPreviewTitle"
              defaultMessage="Graph preview"
            />
          ),
          headerContent: (
            <EuiBetaBadge
              alignment="middle"
              iconType="beaker"
              data-test-subj={GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID}
              label={i18n.translate(
                'xpack.securitySolution.flyout.document.visualizations.graphPreview.technicalPreviewLabel',
                { defaultMessage: 'Technical Preview' }
              )}
              tooltipContent={i18n.translate(
                'xpack.securitySolution.flyout.document.visualizations.graphPreview.technicalPreviewTooltip',
                {
                  defaultMessage:
                    'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                }
              )}
            />
          ),
          iconType: showIcon ? 'arrowStart' : undefined,
          ...(showLink && {
            link: {
              callback: onShowGraph,
              tooltip: (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.document.visualizations.graphPreview.openGraphTooltip"
                  defaultMessage="Open graph"
                />
              ),
            },
          }),
        }}
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        content={!isLoading && !isError ? { paddingSize: 'none' } : undefined}
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
