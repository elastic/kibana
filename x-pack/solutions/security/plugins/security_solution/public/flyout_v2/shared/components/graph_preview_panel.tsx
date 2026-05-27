/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { ExpandablePanel } from './expandable_panel';
import { GraphPreview } from './graph_preview';
import { GRAPH_PREVIEW_TECHNICAL_PREVIEW_TEST_ID, GRAPH_PREVIEW_TEST_ID } from './test_ids';

export type GraphPreviewData = React.ComponentProps<typeof GraphPreview>['data'];

export interface GraphPreviewPanelProps {
  /** Callback invoked when the user opens the full graph visualization. When omitted, no expand link is shown. */
  onShowGraph?: () => void;
  /** Whether to show the graph preview panel header icon. */
  showIcon: boolean;
  /** Whether to hide navigation to the full graph visualization. */
  disableNavigation: boolean;
  /** Whether the graph preview is available for the current document. */
  shouldShowGraph: boolean;
  /** Whether the graph preview data is currently loading. */
  isLoading: boolean;
  /** Whether loading the graph preview data failed. */
  isError: boolean;
  /** Data used to render the graph preview nodes and edges. */
  data?: GraphPreviewData;
}

/** Displays a graph preview panel or graph visualization upsell for the current document. */
export const GraphPreviewPanel = ({
  shouldShowGraph,
  isLoading,
  isError,
  data,
  onShowGraph,
  showIcon,
  disableNavigation,
}: GraphPreviewPanelProps) => {
  const GraphVisualizationUpsell = useUpsellingComponent('graph_visualization');

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
};
