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
import type {
  Edge,
  FitViewOptions,
  Node,
  NodeChange,
  ReactFlowInstance,
  FitView,
} from '@xyflow/react';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { CommonProps } from '@elastic/eui';
import { SvgDefsMarker } from '../edge/markers';
import { LabelNode, EdgeGroupNode, RelationshipNode, EntityNode } from '../node';
import { layoutGraph } from './layout_graph';
import { DefaultEdge } from '../edge';
import { Minimap } from '../minimap/minimap';
import type { EdgeViewModel, NodeViewModel } from '../types';
import { isConnectorShape, isEntityNode, enrichEntityNodeData } from '../utils';
import { ONLY_RENDER_VISIBLE_ELEMENTS, GRID_SIZE } from '../constants';
import { getDetailLevel, DETAIL_LEVEL_ZOOM_THRESHOLD, type DetailLevel } from '../detail_level';

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
  hexagon: EntityNode,
  pentagon: EntityNode,
  ellipse: EntityNode,
  rectangle: EntityNode,
  diamond: EntityNode,
  entity: EntityNode,
  label: LabelNode,
  group: EdgeGroupNode,
  relationship: RelationshipNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

// Cap fitView zoom just below the simplified→detailed threshold so the fit-view
// button always zooms out to a simplified layout view. The user can then scroll
// in past the threshold to switch to the detailed layout.
const FIT_VIEW_MAX_ZOOM = DETAIL_LEVEL_ZOOM_THRESHOLD - 0.01;

const fitViewOptions: FitViewOptions<Node<NodeViewModel>> = {
  duration: 200,
  maxZoom: FIT_VIEW_MAX_ZOOM,
};

const nonInteractiveFitViewOptions: FitViewOptions<Node<NodeViewModel>> = {
  ...fitViewOptions,
  maxZoom: 0.85,
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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const fitViewRef = useRef<FitView<Node<NodeViewModel>> | null>(null);
    const currNodesRef = useRef<NodeViewModel[]>([]);
    const currEdgesRef = useRef<EdgeViewModel[]>([]);
    const isInitialRenderRef = useRef(true);
    // Set to true while a programmatic fitView is animating to suppress onMove
    // layout switches mid-animation.
    const isProgrammaticFitRef = useRef(false);
    // Callback to fire once ReactFlow has measured nodes after a layout update
    const pendingFitViewRef = useRef<(() => void) | null>(null);
    // Callback to execute inside onInitCallback after the next ReactFlow remount.
    // Used when setReactFlowKey forces a remount and we need the new instance's
    // fitView before we can proceed (e.g. interactive prop change).
    const pendingOnInitRef = useRef<(() => void) | null>(null);
    const [isGraphInteractive, setIsGraphInteractive] = useState(interactive);
    const [nodesState, setNodes, onNodesChangeInternal] = useNodesState<Node<NodeViewModel>>([]);

    const onNodesChange = useCallback(
      (changes: NodeChange<Node<NodeViewModel>>[]) => {
        onNodesChangeInternal(changes);
        // Fire the pending fitView once ReactFlow reports node dimensions (nodes measured by DOM)
        if (
          pendingFitViewRef.current &&
          changes.some((c) => c.type === 'dimensions' && c.resizing === false)
        ) {
          const cb = pendingFitViewRef.current;
          pendingFitViewRef.current = null;
          cb();
        }
      },
      [onNodesChangeInternal]
    );

    // Fallback: fire pendingFitViewRef if ReactFlow never delivers a dimensions change
    // (e.g. in test environments where there is no real DOM layout engine).
    const scheduleFitViewFallback = useCallback((cb: () => void) => {
      pendingFitViewRef.current = cb;
      setTimeout(() => {
        if (pendingFitViewRef.current === cb) {
          pendingFitViewRef.current = null;
          cb();
        }
      }, 100);
    }, []);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeViewModel>>([]);
    const [reactFlowKey, setReactFlowKey] = useState(0);
    // Always start in simplified layout so the initial fitView zooms out to show
    // everything. onMove re-layouts to detailed once the user zooms in past 0.7.
    const detailLevelRef = useRef<DetailLevel>('simplified');
    const [detailLevelState, setDetailLevelState] = useState<DetailLevel>('simplified');
    const setDetailLevel = useCallback((level: DetailLevel) => {
      detailLevelRef.current = level;
      setDetailLevelState(level);
    }, []);

    // Wrapper used by controls and data effects. When called with fitViewOptions
    // (which caps maxZoom below the simplified/detailed threshold), it first
    // re-layouts in simplified so positions match the simplified node sizes.
    // Sets isProgrammaticFitRef to suppress onMove layout switches mid-animation.
    const fitView = useCallback(
      (opts?: FitViewOptions<Node<NodeViewModel>>) => {
        const duration = opts?.duration ?? 0;
        isProgrammaticFitRef.current = true;
        setTimeout(() => {
          isProgrammaticFitRef.current = false;
        }, duration + 300);

        const capsBelowThreshold =
          opts?.maxZoom !== undefined && opts.maxZoom < DETAIL_LEVEL_ZOOM_THRESHOLD;
        if (capsBelowThreshold && detailLevelRef.current !== 'simplified') {
          // Switch layout back to simplified so positions match the simplified
          // node sizes that will be shown below the threshold zoom.
          setDetailLevel('simplified');
          const { initialNodes, initialEdges } = processGraph(
            currNodesRef.current,
            currEdgesRef.current,
            isGraphInteractive
          );
          const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges, 'simplified');
          setNodes(layoutedNodes);
          setEdges(initialEdges);
          // Wait for nodes to be re-measured before fitting
          scheduleFitViewFallback(() => fitViewRef.current?.(opts));
          return;
        }
        fitViewRef.current?.(opts);
      },
      [isGraphInteractive, setDetailLevel, setNodes, setEdges, scheduleFitViewFallback]
    );

    const onMove = useCallback(
      (
        _event: MouseEvent | TouchEvent | null,
        { zoom }: { x: number; y: number; zoom: number }
      ) => {
        if (!interactive || isProgrammaticFitRef.current) return;
        const level = getDetailLevel(zoom);
        if (level === detailLevelRef.current || currNodesRef.current.length === 0) return;
        setDetailLevel(level);

        const { initialNodes, initialEdges } = processGraph(
          currNodesRef.current,
          currEdgesRef.current,
          isGraphInteractive
        );
        const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges, level);
        setNodes(layoutedNodes);
        setEdges(initialEdges);
      },
      [interactive, isGraphInteractive, setNodes, setEdges, setDetailLevel]
    );

    // Sync isGraphInteractive with interactive prop and re-process nodes when it changes
    useEffect(() => {
      setIsGraphInteractive(interactive);

      // Re-process graph with new interactive state if nodes exist
      if (currNodesRef.current.length > 0) {
        const { initialNodes, initialEdges } = processGraph(
          currNodesRef.current,
          currEdgesRef.current,
          interactive
        );

        // Force ReactFlow to remount to apply new className. Queue the layout
        // update and fitView to run inside onInitCallback so it uses the new
        // ReactFlow instance's fitView (not the stale one from before remount).
        pendingOnInitRef.current = () => {
          setDetailLevel('simplified');
          const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges, 'simplified');
          setNodes(layoutedNodes);
          setEdges(initialEdges);
          scheduleFitViewFallback(() => fitView(fitViewOptions));
        };
        setReactFlowKey((prev) => prev + 1);
      }
    }, [interactive, setNodes, setEdges, fitView, setDetailLevel, scheduleFitViewFallback]);

    // Filter the ids of those nodes that are origin events
    const originNodeIds = useMemo(
      () => nodes.filter((node) => node.isOrigin || node.isOriginAlert).map((node) => node.id),
      [nodes]
    );

    useEffect(() => {
      // On nodes or edges changes, or interactive state changes, reset the graph and re-layout
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

        currNodesRef.current = nodes;
        currEdgesRef.current = edges;

        if (!interactive) {
          // Non-interactive preview: just update nodes/edges directly.
          // ReactFlow's fitView prop handles centering automatically.
          // Always use simplified layout for preview.
          setDetailLevel('simplified');
          const { nodes: simplifiedNodes } = layoutGraph(initialNodes, initialEdges, 'simplified');
          setNodes(simplifiedNodes);
          setEdges(initialEdges);
          return;
        }

        // Interactive graph: remount ReactFlow to clear internal hover/selection state,
        // then set nodes after remount so the layout is applied to a clean instance.
        setReactFlowKey((prev) => prev + 1);

        const isInitial = isInitialRenderRef.current;
        if (isInitial) {
          isInitialRenderRef.current = false;
        }

        const filterExistingNodeIds = (nodeIds: string[]) => {
          const existingNodeIds = new Set(nodes.map((node) => node.id));
          return nodeIds.filter((nodeId) => existingNodeIds.has(nodeId));
        };

        // Set nodes/edges after ReactFlow remounts. Always simplified; onMove switches to detailed.
        // scheduleFitViewFallback fires once ReactFlow measures nodes (or after 100ms fallback).
        setTimeout(() => {
          setDetailLevel('simplified');
          const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges, 'simplified');
          setNodes(layoutedNodes);
          setEdges(initialEdges);

          scheduleFitViewFallback(() => {
            if (isInitial) {
              fitView(fitViewOptions);
              return;
            }

            if (newNodes.length === 0) {
              return;
            }

            const centerGraphOn = (nodeIds: string[]) => {
              fitView({
                ...fitViewOptions,
                nodes: nodeIds.map((nodeId) => ({ id: nodeId })),
              });
            };

            if (!onCenterGraphAfterRefresh) {
              centerGraphOn(newNodes.map((node) => node.id));
              return;
            }

            const callbackRetValue = onCenterGraphAfterRefresh(newNodes);

            if (callbackRetValue === undefined) {
              centerGraphOn(newNodes.map((node) => node.id));
              return;
            }

            if (callbackRetValue === 'fit-view') {
              fitView(fitViewOptions);
              return;
            }

            if (!Array.isArray(callbackRetValue) || callbackRetValue.length === 0) {
              return;
            }

            const nodeIdsToCenterOn = filterExistingNodeIds(callbackRetValue);

            if (nodeIdsToCenterOn.length > 0) {
              centerGraphOn(nodeIdsToCenterOn);
            }
          });
        }, 0);
      }
    }, [
      nodes,
      edges,
      setNodes,
      setEdges,
      isGraphInteractive,
      interactive,
      fitView,
      onCenterGraphAfterRefresh,
      setDetailLevel,
      scheduleFitViewFallback,
    ]);

    const onInitCallback = useCallback(
      (xyflow: ReactFlowInstance<Node<NodeViewModel>, Edge<EdgeViewModel>>) => {
        fitViewRef.current = xyflow.fitView;

        // Fire any work that was queued to run after the next remount (e.g. when
        // interactive changes and setReactFlowKey forces a new ReactFlow instance).
        if (pendingOnInitRef.current) {
          const cb = pendingOnInitRef.current;
          pendingOnInitRef.current = null;
          cb();
        }

        // For non-interactive previews, re-fit on container resize so the graph
        // scales correctly when the flyout panel expands or is resized.
        if (!interactive) {
          const target = containerRef.current;
          if (target) {
            const resizeObserver = new ResizeObserver(() => {
              xyflow.fitView(nonInteractiveFitViewOptions);
            });
            resizeObserver.observe(target);
          }
        }
      },
      [interactive]
    );

    return (
      <div ref={containerRef} {...rest}>
        <SvgDefsMarker />
        <ReactFlow
          key={interactive ? reactFlowKey : undefined}
          data-test-subj={GRAPH_ID}
          onInit={onInitCallback}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodes={nodesState}
          edges={edgesState}
          nodesConnectable={false}
          edgesFocusable={false}
          // Disable React Flow's built-in selection/focus in non-interactive mode (e.g. flyout
          // preview) so nodes never receive a selected/focused state through keyboard focus or
          // programmatic selection, which would otherwise show selection visuals.
          nodesFocusable={interactive}
          elementsSelectable={interactive}
          onlyRenderVisibleElements={ONLY_RENDER_VISIBLE_ELEMENTS}
          snapToGrid={true}
          snapGrid={[GRID_SIZE, GRID_SIZE]}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          proOptions={{ hideAttribution: true }}
          panOnDrag={isGraphInteractive && !isLocked}
          zoomOnScroll={isGraphInteractive && !isLocked}
          zoomOnPinch={isGraphInteractive && !isLocked}
          zoomOnDoubleClick={isGraphInteractive && !isLocked}
          preventScrolling={interactive}
          nodesDraggable={interactive && isGraphInteractive && !isLocked}
          maxZoom={interactive ? 1.3 : nonInteractiveFitViewOptions.maxZoom}
          minZoom={0.1}
          onMove={onMove}
          {...(!interactive && {
            fitView: true,
            fitViewOptions: nonInteractiveFitViewOptions,
          })}
        >
          {interactive && (
            <Panel position="bottom-right">
              <Controls
                fitViewOptions={fitViewOptions}
                nodeIdsToCenterOn={originNodeIds}
                fitViewFn={fitView as (opts?: FitViewOptions) => void}
              />
            </Panel>
          )}
          {children}
          <Background id={backgroundId} />
          {interactive && showMinimap && (
            <Minimap
              zoomable={!isLocked}
              pannable={!isLocked}
              nodesState={nodesState}
              detailLevel={detailLevelState}
            />
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
      className: interactive ? undefined : 'non-interactive',
    };

    if (node.type === 'group' && nodeData.shape === 'group') {
      node.sourcePosition = Position.Right;
      node.targetPosition = Position.Left;
      node.resizing = false;
      node.focusable = false;
    } else if (
      (nodeData.shape === 'label' || nodeData.shape === 'relationship') &&
      nodeData.parentId
    ) {
      node.parentId = nodeData.parentId;
      node.extent = 'parent';
      node.expandParent = false;
      node.draggable = false;
    } else if (isEntityNode(nodeData)) {
      node.data = enrichEntityNodeData(nodeData, interactive);
    }

    return node;
  });

  const initialEdges: Array<Edge<EdgeViewModel>> = edgesModel
    .filter((edgeData) => nodesById[edgeData.source] && nodesById[edgeData.target])
    .map((edgeData) => {
      const sourceShape = nodesById[edgeData.source].shape;
      const targetShape = nodesById[edgeData.target].shape;

      const isIn = !isConnectorShape(sourceShape) && targetShape === 'group';
      const isInside = sourceShape === 'group' && isConnectorShape(targetShape);
      const isOut = isConnectorShape(sourceShape) && targetShape === 'group';
      const isOutside = sourceShape === 'group' && !isConnectorShape(targetShape);

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
