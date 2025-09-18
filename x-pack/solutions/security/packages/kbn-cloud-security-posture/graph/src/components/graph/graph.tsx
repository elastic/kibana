/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { size, isEmpty, isEqual, xorWith } from 'lodash';
import {
  Background,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Edge, FitViewOptions, Node, ReactFlowInstance, FitView } from '@xyflow/react';
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
import { Minimap } from '../minimap/minimap';
import type { EdgeViewModel, NodeViewModel } from '../types';
import { ONLY_RENDER_VISIBLE_ELEMENTS, GRID_SIZE } from '../constants';

import '@xyflow/react/dist/style.css';
import { GlobalGraphStyles } from './styles';
import { Controls } from '../controls/controls';
import { GRAPH_ID } from '../test_ids';

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
   * Determines whether the minimap is visible or not in interactive graphs
   */
  showMinimap?: boolean;
  /**
   * Additional children to be rendered inside the graph component.
   */
  children?: React.ReactNode;
  /**
   * Callback invoked when the graph is updated with new nodes.
   * Receives one argument with the list of newly added nodes.
   * When callback is undefined, graph will center on new nodes (default behavior).
   * Based on the return value of this callback:
   * - Returning undefined will center the graph on new nodes (default behavior)
   * - Returning "fit-view" will fit entire graph into view
   * - Returning empty array or list of non-existent node ids will keep the graph with its current position
   * - Returning list of existent node ids will center the graph on those nodes
   */
  onCenterGraphAfterRefresh?: (newNodes: NodeViewModel[]) => 'fit-view' | string[] | void;
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

const fitViewOptions: FitViewOptions<Node<NodeViewModel>> = {
  duration: 200,
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
    showMinimap = false,
    children,
    onCenterGraphAfterRefresh,
    ...rest
  }: GraphProps) => {
    const backgroundId = useGeneratedHtmlId();
    const fitViewRef = useRef<FitView<Node<NodeViewModel>> | null>(null);
    const currNodesRef = useRef<NodeViewModel[]>([]);
    const currEdgesRef = useRef<EdgeViewModel[]>([]);
    const isInitialRenderRef = useRef(true);
    const [isGraphInteractive, _setIsGraphInteractive] = useState(interactive);
    const [nodesState, setNodes, onNodesChange] = useNodesState<Node<NodeViewModel>>([]);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeViewModel>>([]);

    // Filter the ids of those nodes that are origin events
    const originNodeIds = useMemo(
      () => nodes.filter((node) => node.isOrigin || node.isOriginAlert).map((node) => node.id),
      [nodes]
    );

    useEffect(() => {
      // On nodes or edges changes reset the graph and re-layout
      if (
        !isArrayOfObjectsEqual(nodes, currNodesRef.current) ||
        !isArrayOfObjectsEqual(edges, currEdgesRef.current)
      ) {
        // Identify new nodes by comparing node IDs
        const previousNodeIds = new Set<NodeViewModel['id']>(
          currNodesRef.current.map((node) => node.id)
        );
        const newNodes = nodes.filter((node) => !previousNodeIds.has(node.id));

        const { initialNodes, initialEdges } = processGraph(nodes, edges, isGraphInteractive);
        const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges);

        setNodes(layoutedNodes);
        setEdges(initialEdges);
        currNodesRef.current = nodes;
        currEdgesRef.current = edges;

        const fitIntoView = () => {
          fitViewRef.current?.(fitViewOptions);
        };

        const centerGraphOn = async (nodeIds: string[]) => {
          await fitViewRef.current?.({
            ...fitViewOptions,
            nodes: nodeIds.map((nodeId) => ({ id: nodeId })),
          });
        };

        const filterExistingNodeIds = (nodeIds: string[]) => {
          const existingNodeIds = new Set(nodes.map((node) => node.id));
          return nodeIds.filter((nodeId) => existingNodeIds.has(nodeId));
        };

        setTimeout(() => {
          // If this is the initial render, skip centering behavior
          if (isInitialRenderRef.current) {
            isInitialRenderRef.current = false;
            return;
          }

          // If nodes haven't changed, do nothing
          if (newNodes.length === 0) {
            return;
          }

          // If nodes have changed but callback is undefined, default to center on new nodes
          if (!onCenterGraphAfterRefresh) {
            centerGraphOn(newNodes.map((node) => node.id));
            return;
          }

          // Get node IDs given by consumer to center the graph on
          const callbackRetValue = onCenterGraphAfterRefresh(newNodes);

          // If callback returns undefined, default to center on new nodes
          if (callbackRetValue === undefined) {
            centerGraphOn(newNodes.map((node) => node.id));
            return;
          }

          if (callbackRetValue === 'fit-view') {
            fitIntoView();
            return;
          }

          if (!Array.isArray(callbackRetValue) || callbackRetValue.length === 0) {
            // With empty array or non-array return value, do nothing
            return;
          }

          const nodeIdsToCenterOn = filterExistingNodeIds(callbackRetValue);

          // if client specified only node ids that do not exist, do nothing
          // Otherwise, center graph on given nodes
          if (nodeIdsToCenterOn.length > 0) {
            // Center graph on specified nodes by client
            centerGraphOn(nodeIdsToCenterOn);
          }
        }, 30);
      }
    }, [nodes, edges, setNodes, setEdges, isGraphInteractive, onCenterGraphAfterRefresh]);

    const onInitCallback = useCallback(
      (xyflow: ReactFlowInstance<Node<NodeViewModel>, Edge<EdgeViewModel>>) => {
        xyflow.fitView();
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
          data-test-subj={GRAPH_ID}
          fitView={true}
          onInit={onInitCallback}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodes={nodesState}
          edges={edgesState}
          nodesConnectable={false}
          edgesFocusable={false}
          onlyRenderVisibleElements={ONLY_RENDER_VISIBLE_ELEMENTS}
          snapToGrid={true} // Snap to grid is enabled to avoid sub-pixel positioning
          snapGrid={[GRID_SIZE, GRID_SIZE]} // Snap nodes to a 10px grid
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
              <Controls fitViewOptions={fitViewOptions} nodeIdsToCenterOn={originNodeIds} />
            </Panel>
          )}
          {children}
          <Background id={backgroundId} />
          {interactive && showMinimap && (
            <Minimap zoomable={!isLocked} pannable={!isLocked} nodesState={nodesState} />
          )}
        </ReactFlow>
        <GlobalGraphStyles />
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
