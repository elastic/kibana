/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiToolTip,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiBadge,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { NodeDataModel, EdgeDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';

import type { EntityType } from '../../../../../../common/api/entity_analytics';
import { useResolutionStatusQuery } from '../../../../../entity_analytics/components/entity_store/hooks/use_resolution_status_query';

const GRAPH_PREVIEW_TEST_ID = 'entity-resolution-graph-preview';
const GRAPH_PREVIEW_LOADING_TEST_ID = 'entity-resolution-graph-preview-loading';
const GRAPH_HEIGHT = 200;

interface EntityResolutionAccordionProps {
  entityType: EntityType;
  entityId: string;
}

// Lazy load Graph component following the pattern from graph_preview.tsx
const GraphLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({ default: module.Graph }))
);

const LoadingComponent: React.FC = () => (
  <EuiSkeletonText
    data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
    contentAriaLabel={i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.entityResolution.loadingAriaLabel',
      {
        defaultMessage: 'entity resolution graph preview',
      }
    )}
  />
);

const EntityResolutionTitle: React.FC = () => (
  <EuiToolTip
    position="top"
    content={
      <FormattedMessage
        id="xpack.securitySolution.entityResolution.accordionTooltip"
        defaultMessage="Shows entity resolution relationships. Primary entities represent the canonical identity, while secondary entities have been resolved/merged to the primary."
      />
    }
  >
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.entityResolution.accordionTitle"
              defaultMessage="Entity Resolution"
            />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="graphApp" color="subdued" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);

export const EntityResolutionAccordion: React.FC<EntityResolutionAccordionProps> = ({
  entityType,
  entityId,
}) => {
  const { euiTheme } = useEuiTheme();

  const { data, isLoading, error } = useResolutionStatusQuery({
    entityType,
    entityId,
    enabled: !!entityId,
  });

  // Transform API response to Graph component props
  const { nodes, edges } = useMemo(() => {
    if (!data?.graph_data) {
      return { nodes: [], edges: [] };
    }

    // Map to NodeDataModel format expected by the Graph component
    const graphNodes: NodeDataModel[] = data.graph_data.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      icon: node.icon,
      shape: node.shape,
      color: node.color,
    }));

    // Map to EdgeDataModel format
    const graphEdges: EdgeDataModel[] = data.graph_data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      color: edge.color,
    }));

    return { nodes: graphNodes, edges: graphEdges };
  }, [data]);

  // Don't render if standalone (no resolution relationships)
  if (!isLoading && data?.resolution_status === 'standalone') {
    return null;
  }

  // Don't render if error
  if (error) {
    return null;
  }

  const getStatusBadge = () => {
    if (!data) return null;

    switch (data.resolution_status) {
      case 'primary':
        return (
          <EuiBadge color="primary">
            <FormattedMessage
              id="xpack.securitySolution.entityResolution.primaryBadge"
              defaultMessage="Primary ({count} resolved)"
              values={{ count: data.secondary_entities?.length ?? 0 }}
            />
          </EuiBadge>
        );
      case 'secondary':
        return (
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.securitySolution.entityResolution.secondaryBadge"
              defaultMessage="Resolved to: {primaryName}"
              values={{
                primaryName:
                  (data.primary_entity?.entity as { name?: string } | undefined)?.name ?? 'Unknown',
              }}
            />
          </EuiBadge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <EuiAccordion
        id="entity-resolution-accordion"
        buttonContent={<EntityResolutionTitle />}
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        initialIsOpen={true}
        data-test-subj="entity-resolution-accordion"
      >
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ padding: 20 }}>
            <EuiFlexItem grow={false}>
              <LoadingComponent />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>{getStatusBadge()}</EuiFlexItem>
            {nodes.length > 0 && (
              <EuiFlexItem>
                <React.Suspense
                  fallback={
                    <EuiPanel>
                      <LoadingComponent />
                    </EuiPanel>
                  }
                >
                  <GraphLazy
                    css={css`
                      height: ${GRAPH_HEIGHT}px;
                      width: 100%;
                      border: 1px solid ${euiTheme.colors.lightShade};
                      border-radius: ${euiTheme.border.radius.medium};
                      overflow: hidden;
                    `}
                    nodes={nodes}
                    edges={edges}
                    interactive={false}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.flyout.entityDetails.entityResolution.graphAriaLabel',
                      {
                        defaultMessage: 'Entity resolution graph preview',
                      }
                    )}
                    data-test-subj={GRAPH_PREVIEW_TEST_ID}
                  />
                </React.Suspense>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

EntityResolutionAccordion.displayName = 'EntityResolutionAccordion';
