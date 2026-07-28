/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { MiniMap, Panel, type Node, type MiniMapNodeProps } from '@xyflow/react';
import { css } from '@emotion/react';
import { EuiButtonIcon, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  GRAPH_MINIMAP_ID,
  GRAPH_MINIMAP_COLLAPSE_ID,
  GRAPH_MINIMAP_EXPAND_ID,
  GRAPH_MINIMAP_ENTITY_NODE_ID,
  GRAPH_MINIMAP_LABEL_NODE_ID,
  GRAPH_MINIMAP_RELATIONSHIP_NODE_ID,
  GRAPH_MINIMAP_UNKNOWN_NODE_ID,
} from '../test_ids';
import type { NodeViewModel } from '../types';
import { isEntityNode, isLabelNode, isRelationshipNode, isStackNode } from '../utils';
import { NODE_HEIGHT, NODE_WIDTH, NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from '../node/styles';
import { GraphControlTooltip } from '../controls/graph_control_tooltip';

interface MiniMapNodeRenderedProps extends MiniMapNodeProps {
  data?: NodeViewModel;
}

const MiniMapNode = ({
  x,
  y,
  width = NODE_WIDTH,
  height = NODE_HEIGHT,
  data,
  id,
}: MiniMapNodeRenderedProps) => {
  const { euiTheme } = useEuiTheme();

  const getEuiColor = useCallback(
    (color: string) =>
      typeof color === 'string' && color in euiTheme.colors
        ? (euiTheme.colors[color as keyof typeof euiTheme.colors] as string)
        : euiTheme.colors.primary,
    [euiTheme]
  );

  // If we don't have node data, we can't render anything useful
  if (!data) return null;

  // For entity nodes, render a square
  if (isEntityNode(data)) {
    return (
      <rect
        data-id={data.id}
        data-test-subj={GRAPH_MINIMAP_ENTITY_NODE_ID}
        x={x}
        y={y}
        height={NODE_HEIGHT}
        width={NODE_WIDTH}
        fill={getEuiColor(data.color ?? 'primary')}
      />
    );
  }

  // For groups of label nodes, render them as individual label nodes below
  if (isStackNode(data)) {
    return null;
  }

  // For label nodes, render a horizontal rectangle
  if (isLabelNode(data)) {
    return (
      <rect
        data-id={data.id}
        data-test-subj={GRAPH_MINIMAP_LABEL_NODE_ID}
        x={x}
        y={y}
        height={NODE_LABEL_HEIGHT}
        width={NODE_LABEL_WIDTH}
        fill={getEuiColor(data.color ?? 'primary')}
      />
    );
  }

  // For relationship nodes, render with the same dark background color as in the graph
  if (isRelationshipNode(data)) {
    return (
      <rect
        data-id={data.id}
        data-test-subj={GRAPH_MINIMAP_RELATIONSHIP_NODE_ID}
        x={x}
        y={y}
        height={NODE_LABEL_HEIGHT}
        width={NODE_LABEL_WIDTH}
        fill={euiTheme.colors.backgroundFilledText}
      />
    );
  }

  // Fallback for unknown types
  return (
    <rect
      data-id={`unknown-${id}`}
      data-test-subj={GRAPH_MINIMAP_UNKNOWN_NODE_ID}
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={getEuiColor('shadow')}
      fill={getEuiColor('backgroundBasePlain')}
    />
  );
};

const CollapseLabel = i18n.translate('securitySolutionPackages.csp.graph.minimap.collapse', {
  defaultMessage: 'Collapse minimap',
});

const ExpandLabel = i18n.translate('securitySolutionPackages.csp.graph.minimap.expand', {
  defaultMessage: 'Expand minimap',
});

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PANEL_RADIUS = 8;
const MINIMAP_PANEL_PADDING = 8;
const MINIMAP_HEADER_HEIGHT = 24;
const COLLAPSED_BUTTON_SIZE = 40;
const COLLAPSED_BUTTON_RADIUS = 8;

export interface MinimapProps {
  /**
   * Flag to determine if the minimap should be zoomable
   */
  zoomable?: boolean;
  /**
   * Flag to determine if the minimap should be pannable
   */
  pannable?: boolean;
  /**
   * The zoom step for the minimap
   */
  zoomStep?: number;
  /**
   * Style to apply to the minimap container
   */
  style?: React.CSSProperties;
  /**
   * Nodes state from ReactFlow
   */
  nodesState?: Node<NodeViewModel>[];
  /**
   * Whether the minimap starts expanded. Defaults to true.
   */
  defaultExpanded?: boolean;
}

/**
 * Minimap component for the Graph. Provides a scaled-down overview of the entire graph
 * with navigation capabilities, and can collapse to a map button.
 *
 * @component
 * @param {MinimapProps} props - The properties for the Minimap component.
 * @returns {JSX.Element} The rendered Minimap component. It will be empty if ReactFlow renders no nodes
 */
export const Minimap = ({
  zoomable = true,
  pannable = true,
  zoomStep = 2,
  style,
  nodesState,
  defaultExpanded = true,
}: MinimapProps) => {
  const { euiTheme } = useEuiTheme();
  const panelShadow = useEuiShadow('s');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Create a mapping of node ids to their data for easy lookup
  const nodeDataMap = React.useMemo(() => {
    return (nodesState ?? []).reduce<Record<NodeViewModel['id'], NodeViewModel>>((acc, node) => {
      if (node.data) {
        acc[node.id] = node.data;
      }
      return acc;
    }, {});
  }, [nodesState]);

  // Use the node map to get correct node data by id
  const getNodeById = React.useCallback(
    (id: string): NodeViewModel | undefined => {
      return nodeDataMap[id];
    },
    [nodeDataMap]
  );

  // Custom node renderer that finds the corresponding node data per id and renders MiniMapNode
  const NodeRenderer = React.useCallback(
    (props: MiniMapNodeProps) => {
      const nodeId = props.id;
      const nodeData = nodeId ? getNodeById(nodeId) : undefined;

      // Return the original MiniMapNode with the correct node data
      return <MiniMapNode {...props} data={nodeData} />;
    },
    [getNodeById]
  );

  const defaultStyle: React.CSSProperties = {
    height: MINIMAP_HEIGHT,
    width: MINIMAP_WIDTH,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  };

  const panelCss = css`
    margin: 0;
  `;

  const expandedPanelCss = css`
    position: relative;
    width: ${MINIMAP_WIDTH + MINIMAP_PANEL_PADDING * 2}px;
    padding: ${MINIMAP_HEADER_HEIGHT}px ${MINIMAP_PANEL_PADDING}px ${MINIMAP_PANEL_PADDING}px;
    border: ${euiTheme.border.thin};
    border-radius: ${MINIMAP_PANEL_RADIUS}px;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${panelShadow};
  `;

  const collapseButtonCss = css`
    && {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 24px;
      height: 24px;
      min-width: 24px;
    }
  `;

  const collapsedButtonCss = css`
    && {
      width: ${COLLAPSED_BUTTON_SIZE}px;
      height: ${COLLAPSED_BUTTON_SIZE}px;
      min-width: ${COLLAPSED_BUTTON_SIZE}px;
      border: ${euiTheme.border.thin};
      border-radius: ${COLLAPSED_BUTTON_RADIUS}px;
      background-color: ${euiTheme.colors.backgroundBasePlain};
      ${panelShadow};
    }
  `;

  const minimapWrapperCss = css`
    & > .react-flow__minimap {
      position: relative !important;
      margin: 0 !important;
    }

    .react-flow__minimap-mask {
      vector-effect: non-scaling-stroke;
      stroke-width: 4px !important;
    }
  `;

  return (
    <Panel position="bottom-left" css={panelCss} data-test-subj={GRAPH_MINIMAP_ID}>
      {isExpanded ? (
        <div css={expandedPanelCss}>
          <GraphControlTooltip content={CollapseLabel} position="top">
            <EuiButtonIcon
              iconType="minus"
              color="text"
              size="xs"
              aria-label={CollapseLabel}
              data-test-subj={GRAPH_MINIMAP_COLLAPSE_ID}
              css={collapseButtonCss}
              onClick={() => setIsExpanded(false)}
            />
          </GraphControlTooltip>
          <div css={minimapWrapperCss}>
            <MiniMap<Node<NodeViewModel>>
              bgColor={euiTheme.colors.backgroundBaseSubdued}
              maskColor={euiTheme.colors.backgroundBasePlain}
              maskStrokeColor={euiTheme.colors.borderBasePlain}
              maskStrokeWidth={4}
              nodeComponent={NodeRenderer}
              style={{ ...defaultStyle, ...style }}
              zoomable={zoomable}
              pannable={pannable}
              zoomStep={zoomStep}
            />
          </div>
        </div>
      ) : (
        <GraphControlTooltip content={ExpandLabel} position="top">
          <EuiButtonIcon
            iconType="map"
            color="text"
            size="m"
            aria-label={ExpandLabel}
            data-test-subj={GRAPH_MINIMAP_EXPAND_ID}
            css={collapsedButtonCss}
            onClick={() => setIsExpanded(true)}
          />
        </GraphControlTooltip>
      )}
    </Panel>
  );
};
