/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { size, isEmpty, isEqual, xorWith } from 'lodash';
import {
  Background,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  MiniMap,
} from '@xyflow/react';
import type { Edge, FitViewOptions, Node, ReactFlowInstance } from '@xyflow/react';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { CommonProps } from '@elastic/eui';
import { SvgDefsMarker } from '../edge/markers';
import {
  HexagonNode,
  PentagonNode,
  EllipseNode,
  RectangleNode,
  DiamondNode,
  LabelNode,
  EdgeGroupNode,
} from '../node';
import { layoutGraph } from './layout_graph';
import { DefaultEdge } from '../edge';
import type { EdgeViewModel, NodeViewModel, MinimapProps } from '../types';
import { ONLY_RENDER_VISIBLE_ELEMENTS } from './constants';

import '@xyflow/react/dist/style.css';
import { Controls } from '../controls/controls';

export interface GraphProps extends CommonProps {
  /**
   * Array of node view models to be rendered in the graph.
   */
  nodes: NodeViewModel[];
  /**
   * Array of edge view models to be rendered in the graph.
   */
  edges: EdgeViewModel[];
  /**
   * Determines whether the graph is interactive (allows panning, zooming, etc.).
   * When set to false, the graph is locked and user interactions are disabled, effectively putting it in view-only mode.
   */
  interactive: boolean;
  /**
   * Determines whether the graph is locked. Nodes and edges are still interactive, but the graph itself is not.
   */
  isLocked?: boolean;
  /**
   * Additional children to be rendered inside the graph component.
   */
  children?: React.ReactNode;
  /**
   * Configuration for the minimap
   */
  minimap?: MinimapProps;
  /**
   * Controls whether nodes snap to grid when moving
   */
  snapToGrid?: boolean;
  /**
   * Controls the grid size - useful for snapping to grid
   * First value is horizontal grid size, second is vertical grid size
   */
  snapGrid?: [number, number];
}

const nodeTypes = {
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  ellipse: EllipseNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
  label: LabelNode,
  group: EdgeGroupNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

/**
 * Graph component renders a graph visualization using ReactFlow.
 * It takes nodes and edges as input and provides interactive controls
 * for panning, zooming, and manipulating the graph.
 *
 * @component
 * @param {GraphProps} props - The properties for the Graph component.
 * @param {NodeViewModel[]} props.nodes - Array of node view models to be rendered in the graph.
 * @param {EdgeViewModel[]} props.edges - Array of edge view models to be rendered in the graph.
 * @param {boolean} props.interactive - Flag to enable or disable interactivity (panning, zooming, etc.).
 * @param {CommonProps} [props.rest] - Additional common properties.
 *
 * @returns {JSX.Element} The rendered Graph component.
 */
export const Graph = memo<GraphProps>(
  ({
    nodes,
    edges,
    interactive,
    isLocked = false,
    children,
    minimap,
    snapToGrid = true,
    snapGrid = [1, 1],
    ...rest
  }: GraphProps) => {
    const backgroundId = useGeneratedHtmlId();
    const fitViewRef = useRef<
      ((fitViewOptions?: FitViewOptions<Node> | undefined) => Promise<boolean>) | null
    >(null);
    const currNodesRef = useRef<NodeViewModel[]>([]);
    const currEdgesRef = useRef<EdgeViewModel[]>([]);
    const [isGraphInteractive, _setIsGraphInteractive] = useState(interactive);
    const [nodesState, setNodes, onNodesChange] = useNodesState<Node<NodeViewModel>>([]);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeViewModel>>([]);
    const [minimapConfig, setMinimapConfig] = useState<GraphProps['minimap']>(minimap);

    useEffect(() => {
      // Update minimap configuration when props change
      setMinimapConfig(minimap);
    }, [minimap]);

    useEffect(() => {
      // On nodes or edges changes reset the graph and re-layout
      if (
        !isArrayOfObjectsEqual(nodes, currNodesRef.current) ||
        !isArrayOfObjectsEqual(edges, currEdgesRef.current)
      ) {
        const { initialNodes, initialEdges } = processGraph(nodes, edges, isGraphInteractive);
        const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(initialEdges);
        currNodesRef.current = nodes;
        currEdgesRef.current = edges;
        setTimeout(() => {
          fitViewRef.current?.();
        }, 30);
      }
    }, [nodes, edges, setNodes, setEdges, isGraphInteractive]);

    const onInitCallback = useCallback(
      (xyflow: ReactFlowInstance<Node<NodeViewModel>, Edge<EdgeViewModel>>) => {
        window.requestAnimationFrame(() => xyflow.fitView());
        fitViewRef.current = xyflow.fitView;

        // When the graph is not initialized as interactive, we need to fit the view on resize
        if (!interactive) {
          const resizeObserver = new ResizeObserver(() => {
            xyflow.fitView();
          });
          resizeObserver.observe(document.querySelector('.react-flow') as Element);
          return () => resizeObserver.disconnect();
        }
      },
      [interactive]
    );

    return (
      <div {...rest}>
        <SvgDefsMarker />
        <ReactFlow
          fitView={true}
          onInit={onInitCallback}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodes={nodesState}
          edges={edgesState}
          nodesConnectable={false}
          edgesFocusable={false}
          onlyRenderVisibleElements={ONLY_RENDER_VISIBLE_ELEMENTS}
          snapToGrid={snapToGrid}
          snapGrid={snapGrid}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          proOptions={{ hideAttribution: true }}
          panOnDrag={isGraphInteractive && !isLocked}
          zoomOnScroll={isGraphInteractive && !isLocked}
          zoomOnPinch={isGraphInteractive && !isLocked}
          zoomOnDoubleClick={isGraphInteractive && !isLocked}
          preventScrolling={interactive}
          nodesDraggable={interactive && isGraphInteractive && !isLocked}
          maxZoom={1.3}
          minZoom={0.1}
        >
          {interactive && (
            <Panel position="bottom-right">
              <Controls showCenter={false} />
            </Panel>
          )}
          {children}
          <Background id={backgroundId} />
          {!isEmpty(minimapConfig) && (
            <MiniMap
              pannable={minimapConfig.pannable}
              zoomable={minimapConfig.zoomable}
              nodeColor={minimapConfig.nodeColor}
              nodeStrokeColor={minimapConfig.nodeStrokeColor}
              nodeClassName={minimapConfig.nodeClassName}
              nodeBorderRadius={minimapConfig.nodeBorderRadius}
              nodeStrokeWidth={minimapConfig.nodeStrokeWidth}
              bgColor={minimapConfig.bgColor}
              maskColor={minimapConfig.maskColor}
              maskStrokeColor={minimapConfig.maskStrokeColor}
              maskStrokeWidth={minimapConfig.maskStrokeWidth}
              position={minimapConfig.position}
              ariaLabel={minimapConfig.ariaLabel}
              inversePan={minimapConfig.inversePan}
              zoomStep={minimapConfig.zoomStep}
              offsetScale={minimapConfig.offsetScale}
            />
          )}
        </ReactFlow>
      </div>
    );
  }
);

Graph.displayName = 'Graph';

const processGraph = (
  nodesModel: NodeViewModel[],
  edgesModel: EdgeViewModel[],
  interactive: boolean
): {
  initialNodes: Array<Node<NodeViewModel>>;
  initialEdges: Array<Edge<EdgeViewModel>>;
} => {
  const nodesById: { [key: string]: NodeViewModel } = {};

  const initialNodes = nodesModel.map((nodeData) => {
    nodesById[nodeData.id] = nodeData;

    const node: Node<NodeViewModel> = {
      id: nodeData.id,
      type: nodeData.shape,
      data: { ...nodeData, interactive },
      position: { x: 0, y: 0 }, // Default position, should be updated later
    };

    if (node.type === 'group' && nodeData.shape === 'group') {
      node.sourcePosition = Position.Right;
      node.targetPosition = Position.Left;
      node.resizing = false;
      node.focusable = false;
    } else if (nodeData.shape === 'label' && nodeData.parentId) {
      node.parentId = nodeData.parentId;
      node.extent = 'parent';
      node.expandParent = false;
      node.draggable = false;
    }

    return node;
  });

  const initialEdges: Array<Edge<EdgeViewModel>> = edgesModel
    .filter((edgeData) => nodesById[edgeData.source] && nodesById[edgeData.target])
    .map((edgeData) => {
      const isIn =
        nodesById[edgeData.source].shape !== 'label' &&
        nodesById[edgeData.target].shape === 'group';
      const isInside =
        nodesById[edgeData.source].shape === 'group' &&
        nodesById[edgeData.target].shape === 'label';
      const isOut =
        nodesById[edgeData.source].shape === 'label' &&
        nodesById[edgeData.target].shape === 'group';
      const isOutside =
        nodesById[edgeData.source].shape === 'group' &&
        nodesById[edgeData.target].shape !== 'label';

      return {
        id: edgeData.id,
        type: 'default',
        source: edgeData.source,
        sourceHandle: isInside ? 'inside' : isOutside ? 'outside' : undefined,
        target: edgeData.target,
        targetHandle: isIn ? 'in' : isOut ? 'out' : undefined,
        focusable: false,
        selectable: false,
        deletable: false,
        data: {
          ...edgeData,
          sourceShape: nodesById[edgeData.source].shape,
          sourceColor: nodesById[edgeData.source].color,
          targetShape: nodesById[edgeData.target].shape,
          targetColor: nodesById[edgeData.target].color,
        },
      };
    });

  return { initialNodes, initialEdges };
};

const isArrayOfObjectsEqual = (x: object[], y: object[]) =>
  size(x) === size(y) && isEmpty(xorWith(x, y, isEqual));
