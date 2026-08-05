/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import {
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
import {
  GRAPH_BACKGROUND_COLOR,
  GRAPH_BACKGROUND_DOT_COLOR,
  GRAPH_BACKGROUND_DOT_GAP,
  GRAPH_BACKGROUND_DOT_SIZE,
} from '@kbn/cloud-security-posture-graph/src/components/constants';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

const ENTITY_SHAPES = new Set(['hexagon', 'pentagon', 'ellipse', 'rectangle', 'diamond']);

/** Preview node radius — matches Figma Graph view preview pills (~8px). */
const NODE_PILL_BORDER_RADIUS = 8;
/** Icon box radius inside the pill. */
const NODE_ICON_BORDER_RADIUS = 4;
const NODE_ICON_SIZE = 20;

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
  /** When true, render a stacked card edge for grouped neighbors. */
  isGroup?: boolean;
}

/**
 * Compact entity pill matching the Figma Graph view preview:
 * backgroundBasePrimary fill, borderBasePrimary, white icon box.
 */
const NodePill = ({ label, icon, isGroup = false }: NodePillProps) => {
  const { euiTheme } = useEuiTheme();
  // Screenshot tokens (Borealis light): fill #F1F6FF, border #BFDBFF — not LightPrimary / Prominent.
  const fillColor = euiTheme.colors.backgroundBasePrimary;
  const borderColor = euiTheme.colors.borderBasePrimary;
  const iconBoxBg = euiTheme.colors.backgroundBasePlain;

  return (
    <div
      css={css`
        position: relative;
        max-width: 148px;
      `}
    >
      {isGroup && (
        <div
          aria-hidden={true}
          css={css`
            position: absolute;
            left: 2px;
            right: 2px;
            bottom: -4px;
            height: 6px;
            border-left: 1px solid ${borderColor};
            border-right: 1px solid ${borderColor};
            border-bottom: 1px solid ${borderColor};
            border-radius: 0 0 ${NODE_PILL_BORDER_RADIUS}px ${NODE_PILL_BORDER_RADIUS}px;
            background: ${iconBoxBg};
            z-index: 0;
          `}
        />
      )}
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          position: relative;
          z-index: 1;
          border: 1px solid ${borderColor};
          border-radius: ${NODE_PILL_BORDER_RADIUS}px;
          padding: 4px 8px;
          background: ${fillColor};
          min-height: 32px;
          opacity: 1;
        `}
      >
        {icon && (
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: ${NODE_ICON_SIZE}px;
                height: ${NODE_ICON_SIZE}px;
                border-radius: ${NODE_ICON_BORDER_RADIUS}px;
                border: 1px solid ${borderColor};
                background: ${iconBoxBg};
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              `}
            >
              <EuiIcon type={icon} size="s" color="primary" aria-hidden={true} />
            </div>
          </EuiFlexItem>
        )}
        <EuiFlexItem
          grow={false}
          css={css`
            overflow: hidden;
            min-width: 0;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textParagraph};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.2;
            `}
          >
            {label ?? '—'}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/**
 * Graph preview under Overview, Visualizations.
 * Shows a simplified 2-node schematic: [main entity] ──▶ [N neighbors].
 * Canvas and pills mirror graph visualizer entity card styling.
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
        neighborCount: entityNeighborCount || Math.max(nodeSet.size - 1, 0),
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

    const neighborIcon = mainNode.icon ?? 'storage';
    const edgeColor = euiTheme.colors.borderBasePrimary;
    const canvasBorder = euiTheme.colors.borderBasePlain;
    const dotRadius = GRAPH_BACKGROUND_DOT_SIZE / 2;

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="none"
        alignItems="center"
        responsive={false}
        data-test-subj={GRAPH_PREVIEW_TEST_ID}
        css={css`
          padding: ${euiTheme.size.m};
          border: 1px solid ${canvasBorder};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${GRAPH_BACKGROUND_COLOR};
          background-image: radial-gradient(
            ${GRAPH_BACKGROUND_DOT_COLOR} ${dotRadius}px,
            transparent ${dotRadius}px
          );
          background-size: ${GRAPH_BACKGROUND_DOT_GAP}px ${GRAPH_BACKGROUND_DOT_GAP}px;
        `}
      >
        {/* Main entity */}
        <EuiFlexItem grow={false}>
          <NodePill label={mainNode.label} icon={mainNode.icon ?? 'storage'} />
        </EuiFlexItem>

        {/* Connecting line + arrow */}
        <EuiFlexItem
          css={css`
            display: flex;
            align-items: center;
            min-width: ${euiTheme.size.xl};
            flex: 1;
            margin-inline: ${euiTheme.size.xs};
          `}
        >
          <div
            css={css`
              position: relative;
              width: 100%;
              height: 1px;
              background: ${edgeColor};
            `}
          >
            <div
              aria-hidden={true}
              css={css`
                position: absolute;
                right: 0;
                top: 50%;
                width: 6px;
                height: 6px;
                border-top: 1px solid ${edgeColor};
                border-right: 1px solid ${edgeColor};
                transform: translateY(-50%) rotate(45deg);
                background: transparent;
              `}
            />
          </div>
        </EuiFlexItem>

        {/* Neighbor count pill */}
        {neighborCount > 0 && (
          <EuiFlexItem grow={false}>
            <NodePill
              isGroup={neighborCount > 1}
              icon={neighborIcon}
              label={i18n.translate(
                'xpack.securitySolution.flyout.right.visualizations.graphPreview.neighborCount',
                {
                  defaultMessage: '{count} {count, plural, one {entity} other {entities}}',
                  values: { count: neighborCount },
                }
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

GraphPreview.displayName = 'GraphPreview';
