/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { GraphPreview } from './graph_preview';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { useShouldShowGraph } from '../../graph/hooks/use_should_show_graph';
import { GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID, GRAPH_PREVIEW_TEST_ID } from './test_ids';

interface CommonProps {
  /**
   * Callback invoked when the user expands the preview into the Graph tools flyout.
   */
  onShowGraph: () => void;
  /**
   * Whether to show the header icon.
   */
  showIcon: boolean;
  /**
   * Whether to disable the graph navigation link.
   */
  disableNavigation: boolean;
}

interface EventModeProps extends CommonProps {
  /**
   * Event mode (default). Derives graph parameters from the document.
   */
  mode?: 'event';
  /**
   * Document to render the graph preview for.
   */
  hit: DataTableRecord;
}

interface EntityModeProps extends CommonProps {
  /**
   * Entity mode. Renders a graph preview rooted at the given entity.
   */
  mode: 'entity';
  /**
   * Entity Store v2 entity ID (entity.id) used as the graph origin.
   */
  entityId: string;
}

export type GraphPreviewContainerProps = EventModeProps | EntityModeProps;

interface PresenterProps extends CommonProps {
  shouldShowGraph: boolean;
  isLoading: boolean;
  isError: boolean;
  data: ReturnType<typeof useFetchGraphData>['data'];
}

const GraphPreviewPresenter = ({
  shouldShowGraph,
  isLoading,
  isError,
  data,
  onShowGraph,
  showIcon,
  disableNavigation,
}: PresenterProps) => {
  const GraphVisualizationUpsell = useUpsellingComponent('graph_visualization');

  if (!shouldShowGraph && !GraphVisualizationUpsell) {
    return null;
  }

  const iconType = showIcon ? 'arrowStart' : undefined;
  const isNavigationEnabled = !disableNavigation;

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
              {
                defaultMessage: 'Technical Preview',
              }
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
        iconType,
        ...(isNavigationEnabled && {
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
};

const EventGraphPreviewContainer = ({
  hit,
  onShowGraph,
  showIcon,
  disableNavigation,
}: Omit<EventModeProps, 'mode'>) => {
  const { eventIds, timestamp, isAlert, shouldShowGraph } = useGraphPreview(hit);

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

  return (
    <GraphPreviewPresenter
      shouldShowGraph={shouldShowGraph}
      isLoading={isLoading}
      isError={isError}
      data={data}
      onShowGraph={onShowGraph}
      showIcon={showIcon}
      disableNavigation={disableNavigation}
    />
  );
};

const EntityGraphPreviewContainer = ({
  entityId,
  onShowGraph,
  showIcon,
  disableNavigation,
}: Omit<EntityModeProps, 'mode'>) => {
  const shouldShowGraph = useShouldShowGraph();

  const { isLoading, isError, data } = useFetchGraphData({
    req: {
      query: {
        entityIds: [{ id: entityId, isOrigin: true }],
        start: 'now-30d',
        end: 'now',
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

  return (
    <GraphPreviewPresenter
      shouldShowGraph={shouldShowGraph}
      isLoading={isLoading}
      isError={isError}
      data={data}
      onShowGraph={onShowGraph}
      showIcon={showIcon}
      disableNavigation={disableNavigation}
    />
  );
};

/**
 * Graph preview under Overview, Visualizations. Shows a non-interactive graph representation
 * with a link to the Graph tools flyout. Supports two modes:
 * - 'event' (default): derived from the document fields via {@link useGraphPreview}
 * - 'entity': rooted at a given Entity Store v2 entity ID
 */
export const GraphPreviewContainer = memo((props: GraphPreviewContainerProps) => {
  if (props.mode === 'entity') {
    return <EntityGraphPreviewContainer {...props} />;
  }
  return <EventGraphPreviewContainer {...props} />;
});

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
