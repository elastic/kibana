/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { MiniMap, Panel, type Node, type MiniMapNodeProps } from '@xyflow/react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiIcon, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  GRAPH_MINIMAP_ID,
  GRAPH_MINIMAP_TOGGLE_ID,
  GRAPH_MINIMAP_ENTITY_NODE_ID,
  GRAPH_MINIMAP_LABEL_NODE_ID,
  GRAPH_MINIMAP_RELATIONSHIP_NODE_ID,
  GRAPH_MINIMAP_UNKNOWN_NODE_ID,
} from '../test_ids';
import type { NodeViewModel } from '../types';
import { isEntityNode, isLabelNode, isRelationshipNode, isStackNode } from '../utils';
import { NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from '../node/styles';
import { CARD_NODE_DEFAULT_HEIGHT, CARD_NODE_WIDTH } from '../node/card_node';
import minimapMapIcon from '../../assets/icons/minimap_map.svg';

/** Folded-map glyph from Figma MiniMap Type=closed — not the EUI `map` (pin) icon. */
const MinimapExpandIcon = () => <EuiIcon type={minimapMapIcon} size="m" color="text" />;

/** Expanded minimap content size from Figma (node 13994:673). */
const MINIMAP_CONTENT_WIDTH = 151;
const MINIMAP_CONTENT_HEIGHT = 96;

/**
 * Padding around graph bounds in the MiniMap viewBox.
 * xyflow defaults to 5 (viewBox ~11× graph size), which leaves the overview looking tiny.
 * A small scale matches the Figma "fit" overview with modest margins.
 */
const MINIMAP_OFFSET_SCALE = 0.15;

interface MiniMapNodeRenderedProps extends MiniMapNodeProps {
  data?: NodeViewModel;
}

const MiniMapNode = ({
  x,
  y,
  width = 0,
  height = 0,
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

  // Always use card footprint for the overview schematic. Measured sizes can shrink
  // in simplified/zoom-invariant mode (~48px) and would make the minimap look tiny again.
  if (isEntityNode(data)) {
    return (
      <rect
        data-id={data.id}
        data-test-subj={GRAPH_MINIMAP_ENTITY_NODE_ID}
        x={x}
        y={y}
        height={CARD_NODE_DEFAULT_HEIGHT}
        width={CARD_NODE_WIDTH}
        fill={getEuiColor(data.color ?? 'primary')}
      />
    );
  }

  // For groups of label nodes, render them as individual label nodes below
  if (isStackNode(data)) {
    return null;
  }

  const labelWidth = NODE_LABEL_WIDTH;

  // For label nodes, render a horizontal rectangle (schematic bar, not full layout height)
  if (isLabelNode(data)) {
    return (
      <rect
        data-id={data.id}
        data-test-subj={GRAPH_MINIMAP_LABEL_NODE_ID}
        x={x}
        y={y}
        height={NODE_LABEL_HEIGHT}
        width={labelWidth}
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
        width={labelWidth}
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
      width={width > 0 ? width : CARD_NODE_WIDTH}
      height={height > 0 ? height : CARD_NODE_DEFAULT_HEIGHT}
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
  /**
   * Whether the minimap starts expanded. Defaults to true.
   */
  defaultExpanded?: boolean;
}

const collapseLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.minimap.collapseAriaLabel',
  {
    defaultMessage: 'Collapse minimap',
  }
);

const expandLabel = i18n.translate('securitySolutionPackages.csp.graph.minimap.expandAriaLabel', {
  defaultMessage: 'Expand minimap',
});

/**
 * Minimap component for the Graph. Provides a scaled-down overview of the entire graph
 * with navigation capabilities, and can collapse to a compact expand control.
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
  const minimapShadow = useEuiShadow('s');
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

  const toggleExpanded = useCallback(() => {
    setIsExpanded((current) => !current);
  }, []);

  const shellCss = css`
    ${minimapShadow}
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: ${euiTheme.size.xs};
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.small};
  `;

  const headerCss = css`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  const contentCss = css`
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-radius: ${euiTheme.border.radius.small};
    overflow: hidden;

    /* Embed xyflow MiniMap inside our chrome instead of as a floating panel. */
    & > .react-flow__minimap {
      position: relative !important;
      inset: auto !important;
      margin: 0 !important;
      box-shadow: none !important;
      width: 100% !important;
      height: ${MINIMAP_CONTENT_HEIGHT}px !important;
    }

    .react-flow__minimap-mask {
      vector-effect: non-scaling-stroke;
      stroke-width: 1.5px !important;
    }
  `;

  const minimapStyle: React.CSSProperties = {
    height: MINIMAP_CONTENT_HEIGHT,
    width: MINIMAP_CONTENT_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    ...style,
  };

  // Dim outside the viewport instead of opaque white, so the overview stays "full"
  // (Figma) even when the main canvas is zoomed in.
  const maskColor = `color-mix(in srgb, ${euiTheme.colors.backgroundBasePlain} 55%, transparent)`;

  return (
    <Panel position="bottom-right" data-test-subj={GRAPH_MINIMAP_ID} css={shellCss}>
      <div css={headerCss}>
        <EuiButtonIcon
          iconType={isExpanded ? 'minus' : MinimapExpandIcon}
          aria-label={isExpanded ? collapseLabel : expandLabel}
          aria-expanded={isExpanded}
          size="xs"
          color="text"
          data-test-subj={GRAPH_MINIMAP_TOGGLE_ID}
          onClick={toggleExpanded}
        />
      </div>
      {isExpanded ? (
        <div css={contentCss}>
          <MiniMap<Node<NodeViewModel>>
            bgColor={euiTheme.colors.backgroundBaseSubdued}
            maskColor={maskColor}
            maskStrokeColor={euiTheme.colors.borderBasePlain}
            maskStrokeWidth={1.5}
            offsetScale={MINIMAP_OFFSET_SCALE}
            nodeComponent={NodeRenderer}
            style={minimapStyle}
            zoomable={zoomable}
            pannable={pannable}
            zoomStep={zoomStep}
            position="bottom-right"
          />
        </div>
      ) : null}
    </Panel>
  );
};
