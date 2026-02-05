/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { MiniMap, type Node, type MiniMapNodeProps } from '@xyflow/react';
import { useEuiTheme, transparentize } from '@elastic/eui';
import {
  GRAPH_MINIMAP_ID,
  GRAPH_MINIMAP_ENTITY_NODE_ID,
  GRAPH_MINIMAP_LABEL_NODE_ID,
  GRAPH_MINIMAP_RELATIONSHIP_NODE_ID,
  GRAPH_MINIMAP_UNKNOWN_NODE_ID,
} from '../test_ids';
import type { NodeViewModel } from '../types';
import { isEntityNode, isLabelNode, isRelationshipNode, isStackNode } from '../utils';
import { NODE_HEIGHT, NODE_WIDTH, NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from '../node/styles';

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
}

/**
 * Minimap component for the Graph. Provides a scaled-down overview of the entire graph
 * with navigation capabilities.
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
}: MinimapProps) => {
  const { euiTheme } = useEuiTheme();

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
    height: 120,
    width: 200,
    // NOTE MiniMap's `bgColor` prop affects the mask so we need to pass our custom bgColor within the `style` prop
    backgroundColor: euiTheme.colors.backgroundBasePlain,
  };

  return (
    <div data-test-subj={GRAPH_MINIMAP_ID}>
      <MiniMap<Node<NodeViewModel>>
        maskColor={transparentize(euiTheme.colors.backgroundBaseFormsControlDisabled, 0.75)}
        nodeComponent={NodeRenderer}
        style={{ ...defaultStyle, ...style }}
        zoomable={zoomable}
        pannable={pannable}
        zoomStep={zoomStep}
        position="bottom-left"
      />
    </div>
  );
};
