/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

const ENTITY_SHAPES = new Set(['hexagon', 'pentagon', 'ellipse', 'rectangle', 'diamond']);

const isEntityNode = (node: NodeDataModel): boolean =>
  ENTITY_SHAPES.has((node as { shape?: string }).shape ?? '');

/**
 * Props for the GraphPreview component.
 */
export interface GraphPreviewProps {
  /**
   * Indicates whether the graph is currently loading.
   */
  isLoading: boolean;

  /**
   * Indicates whether there was an error loading the graph.
   */
  isError: boolean;

  /**
   * Optional data for the graph, including nodes and edges.
   */
  data?: {
    /**
     * Array of node data models.
     */
    nodes: NodeDataModel[];

    /**
     * Array of edge data models.
     */
    edges: EdgeDataModel[];
  };
}

const LoadingComponent = () => (
  <EuiSkeletonText
    data-test-subj={GRAPH_PREVIEW_LOADING_TEST_ID}
    contentAriaLabel={i18n.translate(
      'xpack.securitySolution.flyout.right.visualizations.graphPreview.loadingAriaLabel',
      {
        defaultMessage: 'graph preview',
      }
    )}
  />
);

interface NodePillProps {
  label?: string;
  icon?: string;
  count?: number;
  color?: 'primary' | 'danger' | 'warning';
}

const NodePill = ({ label, icon, count, color = 'primary' }: NodePillProps) => {
  const { euiTheme } = useEuiTheme();

  const borderColor =
    color === 'danger'
      ? euiTheme.colors.danger
      : color === 'warning'
      ? euiTheme.colors.warning
      : euiTheme.colors.primary;

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="xs"
      alignItems="center"
      css={css`
        border: 1.5px solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        background: ${euiTheme.colors.backgroundBasePlain};
        max-width: 140px;
      `}
    >
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="s" aria-hidden={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        grow={false}
        css={css`
          overflow: hidden;
        `}
      >
        <EuiText
          size="xs"
          css={css`
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {label ?? '—'}
        </EuiText>
      </EuiFlexItem>
      {count !== undefined && count > 1 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{count}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/**
 * Graph preview under Overview, Visualizations.
 * Shows a simplified 2-node schematic: [main entity] ── [N neighbors].
 */
export const GraphPreview: React.FC<GraphPreviewProps> = memo(
  ({ isLoading, isError, data }: GraphPreviewProps) => {
    const { euiTheme } = useEuiTheme();

    const { mainNode, neighborCount } = useMemo(() => {
      const nodes = data?.nodes ?? [];
      const edges = data?.edges ?? [];

      const entityNodes = nodes.filter(isEntityNode);
      if (entityNodes.length === 0) return { mainNode: null, neighborCount: 0 };

      // Use the first entity node as the main entity (origin of the graph)
      const main = entityNodes[0] as {
        id: string;
        label?: string;
        icon?: string;
        color?: string;
        count?: number;
      };

      // Count distinct entity neighbors connected to the main node via edges
      const neighborIds = new Set<string>();
      edges.forEach((edge) => {
        const e = edge as { source: string; target: string };
        if (e.source === main.id && e.target !== main.id) neighborIds.add(e.target);
        if (e.target === main.id && e.source !== main.id) neighborIds.add(e.source);
      });

      // Only count entity nodes (not labels/groups)
      const nodeSet = new Set(nodes.map((n) => (n as { id: string }).id));
      const entityNeighborCount = [...neighborIds].filter((id) => {
        const neighbor = nodes.find((n) => (n as { id: string }).id === id);
        return neighbor ? isEntityNode(neighbor) : false;
      }).length;

      return {
        mainNode: main,
        neighborCount: entityNeighborCount || nodeSet.size - 1,
      };
    }, [data]);

    if (isLoading) return <LoadingComponent />;

    if (isError || !mainNode) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.visualizations.graphPreview.errorDescription"
          defaultMessage="An error is preventing this alert from being visualized."
        />
      );
    }

    const color = (mainNode.color as 'primary' | 'danger' | 'warning') ?? 'primary';
    const lineColor =
      color === 'danger'
        ? euiTheme.colors.danger
        : color === 'warning'
        ? euiTheme.colors.warning
        : euiTheme.colors.primary;

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="none"
        alignItems="center"
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        css={css`
          padding: ${euiTheme.size.m} 0;
        `}
      >
        {/* Main entity */}
        <EuiFlexItem grow={false}>
          <NodePill
            label={mainNode.label}
            icon={mainNode.icon}
            count={mainNode.count}
            color={color}
          />
        </EuiFlexItem>

        {/* Connecting line */}
        <EuiFlexItem
          css={css`
            height: 1.5px;
            background: ${lineColor};
            min-width: ${euiTheme.size.xl};
            flex: 1;
          `}
        />

        {/* Neighbor count pill */}
        {neighborCount > 0 && (
          <EuiFlexItem grow={false}>
            <NodePill
              label={i18n.translate(
                'xpack.securitySolution.flyout.right.visualizations.graphPreview.neighborCount',
                {
                  defaultMessage: '{count} {count, plural, one {entity} other {entities}}',
                  values: { count: neighborCount },
                }
              )}
              color="primary"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

GraphPreview.displayName = 'GraphPreview';
