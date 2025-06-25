/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBetaBadge, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';
import { GraphPreview } from './graph_preview';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { useNavigateToGraphVisualization } from '../../shared/hooks/use_navigate_to_graph_visualization';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';

/**
 * Graph preview under Overview, Visualizations. It shows a graph representation of entities.
 */
export const GraphPreviewContainer: React.FC = () => {
  const renderingId = useGeneratedHtmlId();
  const {
    dataAsNestedObject,
    getFieldsData,
    eventId,
    indexName,
    scopeId,
    isRulePreview,
    isPreviewMode,
    dataFormattedForFieldBrowser,
  } = useDocumentDetailsContext();

  const allowFlyoutExpansion = useMemo(
    () => !isPreviewMode && !isRulePreview,
    [isRulePreview, isPreviewMode]
  );

  const { navigateToGraphVisualization } = useNavigateToGraphVisualization({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
  });

  const {
    eventIds,
    timestamp = new Date().toISOString(),
    hasGraphRepresentation,
    isAlert,
  } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

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
      enabled: hasGraphRepresentation,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    if (hasGraphRepresentation) {
      uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, GRAPH_PREVIEW);
    }
  }, [hasGraphRepresentation, renderingId]);

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
        iconType: allowFlyoutExpansion ? 'arrowStart' : 'indexMapping',
        ...(allowFlyoutExpansion && {
          link: {
            callback: navigateToGraphVisualization,
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
      <GraphPreview isLoading={isLoading} isError={isError} data={data} />
    </ExpandablePanel>
  );
};

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
