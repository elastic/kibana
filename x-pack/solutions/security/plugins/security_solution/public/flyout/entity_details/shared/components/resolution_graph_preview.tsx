/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSkeletonText, EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useResolutionGraphData } from '../hooks/use_resolution_graph_data';

const GraphLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.Graph,
  }))
);

const GRAPH_HEIGHT = 200;

const graphContainerStyles = css`
  height: ${GRAPH_HEIGHT}px;
  width: 100%;
`;

interface ResolutionGraphPreviewProps {
  /**
   * The entity type (e.g., 'host', 'user')
   */
  entityType: string;
  /**
   * The entity ID in Entity Store format (e.g., "server-01@host")
   */
  entityId: string | undefined;
}

/**
 * Displays a graph preview of entity resolution relationships.
 * Shows a star topology with the primary entity at the center.
 * Only renders if the entity is part of a resolution group with 2+ members.
 */
export const ResolutionGraphPreview: React.FC<ResolutionGraphPreviewProps> = memo(
  ({ entityType, entityId }) => {
    const { data, isLoading, isError } = useResolutionGraphData(entityType, entityId);

    const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes]);
    const edges = useMemo(() => data?.edges ?? [], [data?.edges]);

    // Don't render if no entity ID provided
    if (!entityId) {
      return null;
    }

    // Don't show section if entity is not part of a resolution group
    // (after loading completes and we have no data)
    if (!isLoading && !data) {
      return null;
    }

    return (
      <>
        <EuiAccordion
          id="resolution-graph-preview"
          buttonContent={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.resolutionGraph.title',
            { defaultMessage: 'Entity Resolution' }
          )}
          initialIsOpen={true}
          data-test-subj="resolution-graph-preview-accordion"
        >
          <EuiSpacer size="s" />
          {isLoading ? (
            <EuiSkeletonText
              data-test-subj="resolution-graph-preview-loading"
              contentAriaLabel={i18n.translate(
                'xpack.securitySolution.flyout.entityDetails.resolutionGraph.loadingAriaLabel',
                { defaultMessage: 'Loading entity resolution graph' }
              )}
            />
          ) : isError ? (
            <EuiText size="s" color="danger" data-test-subj="resolution-graph-preview-error">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.resolutionGraph.error"
                defaultMessage="Unable to load resolution data"
              />
            </EuiText>
          ) : (
            <React.Suspense
              fallback={
                <EuiSkeletonText
                  contentAriaLabel={i18n.translate(
                    'xpack.securitySolution.flyout.entityDetails.resolutionGraph.loadingAriaLabel',
                    { defaultMessage: 'Loading entity resolution graph' }
                  )}
                />
              }
            >
              <GraphLazy
                css={graphContainerStyles}
                nodes={nodes}
                edges={edges}
                interactive={false}
                aria-label={i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.resolutionGraph.graphAriaLabel',
                  { defaultMessage: 'Entity resolution graph preview' }
                )}
                data-test-subj="resolution-graph-preview-graph"
              />
            </React.Suspense>
          )}
        </EuiAccordion>
        <EuiSpacer size="m" />
      </>
    );
  }
);

ResolutionGraphPreview.displayName = 'ResolutionGraphPreview';
