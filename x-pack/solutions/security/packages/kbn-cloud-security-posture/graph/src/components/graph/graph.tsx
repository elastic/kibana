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
  SelectionMode,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Edge, FitViewOptions, Node, ReactFlowInstance, FitView } from '@xyflow/react';
import { useGeneratedHtmlId, useEuiTheme } from '@elastic/eui';
import type { CommonProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { SvgDefsMarker } from '../edge/markers';
import { CardNode, LabelNode, EdgeGroupNode, RelationshipNode } from '../node';
import { layoutGraph } from './layout_graph';
import { DefaultEdge } from '../edge';
import { mapEdgeViewModelToReactFlowEdge } from '../edge/edge_processing';
import { Minimap } from '../minimap/minimap';
import type { EdgeViewModel, NodeViewModel } from '../types';
import { ONLY_RENDER_VISIBLE_ELEMENTS, GRID_SIZE } from '../constants';

import '@xyflow/react/dist/style.css';
import { GlobalGraphStyles } from './styles';
import { Controls, CONTROL_PANEL_MARGIN_RIGHT } from '../controls/controls';
import {
  GraphInteractionToolContext,
  type GraphInteractionTool,
} from '../controls/graph_interaction_tool_context';
import { GRAPH_ID } from '../test_ids';
import { useGraphFullscreen } from '../../hooks/use_graph_fullscreen';
import { withZoomInvariant } from '../zoom/with_zoom_invariant';
import { ZoomNodeInternalsSync } from '../zoom/zoom_node_internals_sync';
import { GraphSelectionHandlers } from './graph_selection_handlers';
import { useGraphInteractionKeyboardShortcuts } from '../../hooks/use_graph_interaction_keyboard_shortcuts';
import { GraphFullscreenContext } from './graph_fullscreen_context';
import { GRAPH_ORIGIN_NODE_CLASS, isOriginEntityOrEventNode } from './graph_origin_utils';

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
  /**
   * When true, origin entities and events are outlined with a dashed border.
   */
  highlightOriginsOnly?: boolean;
}

const nodeTypes = {
  hexagon: withZoomInvariant(CardNode),
  pentagon: withZoomInvariant(CardNode),
  ellipse: withZoomInvariant(CardNode),
  rectangle: withZoomInvariant(CardNode),
  diamond: withZoomInvariant(CardNode),
  label: withZoomInvariant(LabelNode),
  group: withZoomInvariant(EdgeGroupNode),
  relationship: withZoomInvariant(RelationshipNode),
};

const edgeTypes = {
  default: DefaultEdge,
};

const fitViewOptions: FitViewOptions<Node<NodeViewModel>> = {
  duration: 200,
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
    highlightOriginsOnly = false,
    css: containerCss,
    onPointerDown,
    ...rest
  }: GraphProps) => {
    const backgroundId = useGeneratedHtmlId();
    const { euiTheme } = useEuiTheme();
    const graphContainerRef = useRef<HTMLDivElement>(null);
    const overlayContainerRef = useRef<HTMLDivElement>(null);
    const { isFullscreen, toggleFullscreen } = useGraphFullscreen(graphContainerRef);
    const fitViewRef = useRef<FitView<Node<NodeViewModel>> | null>(null);
    const currNodesRef = useRef<NodeViewModel[]>([]);
    const currEdgesRef = useRef<EdgeViewModel[]>([]);
    const isInitialRenderRef = useRef(true);
    const [isGraphInteractive, setIsGraphInteractive] = useState(interactive);
    const [interactionTool, setInteractionTool] = useState<GraphInteractionTool>('select');
    const applyFiltersToggleRef = useRef<(() => void) | null>(null);
    const [nodesState, setNodes, onNodesChange] = useNodesState<Node<NodeViewModel>>([]);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeViewModel>>([]);
    const [reactFlowKey, setReactFlowKey] = useState(0);
    const prevHighlightOriginsOnlyRef = useRef(highlightOriginsOnly);

    // Sync isGraphInteractive with interactive prop and re-process nodes when it changes.
    // Highlight-only updates are handled separately to preserve viewport zoom/pan.
    useEffect(() => {
      setIsGraphInteractive(interactive);

      // Re-process graph with new interactive state if nodes exist
      if (currNodesRef.current.length > 0) {
        const { initialNodes, initialEdges } = processGraph(
          currNodesRef.current,
          currEdgesRef.current,
          interactive,
          highlightOriginsOnly
        );
        const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges);

        setReactFlowKey((prev) => prev + 1);

        setTimeout(() => {
          setNodes(layoutedNodes);
          setEdges(initialEdges);
        }, 0);
      }
    }, [interactive, setEdges, setNodes]);

    // Filter the ids of those nodes that are origin events
    const originNodeIds = useMemo(
      () => nodes.filter((node) => node.isOrigin || node.isOriginAlert).map((node) => node.id),
      [nodes]
    );

    useEffect(() => {
      const nodesChanged = !isArrayOfObjectsEqual(nodes, currNodesRef.current);
      const edgesChanged = !isArrayOfObjectsEqual(edges, currEdgesRef.current);
      const highlightChanged = prevHighlightOriginsOnlyRef.current !== highlightOriginsOnly;
      prevHighlightOriginsOnlyRef.current = highlightOriginsOnly;

      if (!nodesChanged && !edgesChanged && !highlightChanged) {
        return;
      }

      const applyHighlightOnlyUpdate = () => {
        const { initialNodes, initialEdges } = processGraph(
          nodes,
          edges,
          isGraphInteractive,
          highlightOriginsOnly
        );

        setNodes((currentNodes) =>
          initialNodes.map((node) => {
            const existing = currentNodes.find((current) => current.id === node.id);
            if (!existing) {
              return node;
            }

            return {
              ...node,
              position: existing.position,
              width: existing.width,
              height: existing.height,
              measured: existing.measured,
            };
          })
        );
        setEdges(initialEdges);
      };

      if (!nodesChanged && !edgesChanged && highlightChanged && currNodesRef.current.length > 0) {
        applyHighlightOnlyUpdate();
        return;
      }

      if (!nodesChanged && !edgesChanged) {
        return;
      }

      const sameStructure = hasSameGraphStructure(
        nodes,
        currNodesRef.current,
        edges,
        currEdgesRef.current
      );

      // Metadata-only updates (e.g. filter toggles) keep viewport zoom/pan and mounted panels.
      if (sameStructure && currNodesRef.current.length > 0) {
        applyHighlightOnlyUpdate();

        currNodesRef.current = nodes;
        currEdgesRef.current = edges;
        return;
      }

      // Identify new nodes by comparing node IDs
      const previousNodeIds = new Set<NodeViewModel['id']>(
        currNodesRef.current.map((node) => node.id)
      );
      const newNodes = nodes.filter((node) => !previousNodeIds.has(node.id));

      const { initialNodes, initialEdges } = processGraph(
        nodes,
        edges,
        isGraphInteractive,
        highlightOriginsOnly
      );
      const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges);
      // Force ReactFlow to remount by changing the key first
      setReactFlowKey((prev) => prev + 1);

      // Then set nodes and edges after a microtask to ensure ReactFlow has remounted
      setTimeout(() => {
        setNodes(layoutedNodes);
        setEdges(initialEdges);
      }, 0);

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
    }, [
      nodes,
      edges,
      setNodes,
      setEdges,
      isGraphInteractive,
      highlightOriginsOnly,
      onCenterGraphAfterRefresh,
    ]);

    const onInitCallback = useCallback(
      (xyflow: ReactFlowInstance<Node<NodeViewModel>, Edge<EdgeViewModel>>) => {
        if (interactive) {
          xyflow.fitView();
        } else {
          xyflow.fitView(nonInteractiveFitViewOptions);
        }
        fitViewRef.current = xyflow.fitView;

        // When the graph is not initialized as interactive, we need to fit the view on resize
        if (!interactive) {
          const resizeObserver = new ResizeObserver(() => {
            xyflow.fitView(nonInteractiveFitViewOptions);
          });
          resizeObserver.observe(document.querySelector('.react-flow') as Element);
          return () => resizeObserver.disconnect();
        }
      },
      [interactive]
    );

    const onToggleFullScreen = useCallback(() => {
      void toggleFullscreen().then(() => {
        setTimeout(() => fitViewRef.current?.(fitViewOptions), 100);
      });
    }, [toggleFullscreen]);

    const registerApplyFiltersToggle = useCallback((toggle: (() => void) | null) => {
      applyFiltersToggleRef.current = toggle;
    }, []);

    const handleSelectToolShortcut = useCallback(() => {
      setInteractionTool('select');
    }, []);

    const handlePanToolShortcut = useCallback(() => {
      setInteractionTool('pan');
    }, []);

    const handleToggleApplyFiltersShortcut = useCallback(() => {
      applyFiltersToggleRef.current?.();
    }, []);

    useGraphInteractionKeyboardShortcuts({
      enabled: interactive,
      onSelectTool: handleSelectToolShortcut,
      onPanTool: handlePanToolShortcut,
      onToggleApplyFiltersPanel: handleToggleApplyFiltersShortcut,
    });

    useEffect(() => {
      if (!interactive) {
        return;
      }

      graphContainerRef.current?.focus({ preventScroll: true });
    }, [interactive]);

    const focusGraphContainer = useCallback(() => {
      if (interactive) {
        graphContainerRef.current?.focus({ preventScroll: true });
      }
    }, [interactive]);

    const handleGraphPointerDown = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        focusGraphContainer();
        onPointerDown?.(event);
      },
      [focusGraphContainer, onPointerDown]
    );

    const interactionToolContextValue = useMemo(
      () => ({
        interactionTool,
        setInteractionTool,
        registerApplyFiltersToggle,
      }),
      [interactionTool, registerApplyFiltersToggle]
    );

    const canDragInteract = isGraphInteractive && !isLocked;
    const isPanTool = interactionTool === 'pan';
    const isSelectTool = canDragInteract && !isPanTool;

    useEffect(() => {
      if (!isPanTool) {
        return;
      }

      setNodes((currentNodes) => {
        if (!currentNodes.some((node) => node.selected)) {
          return currentNodes;
        }

        return currentNodes.map((node) => (node.selected ? { ...node, selected: false } : node));
      });
    }, [isPanTool, setNodes]);

    const reactFlowClassName = useMemo(
      () =>
        [
          isPanTool ? 'graph-tool-pan' : 'graph-tool-select',
          highlightOriginsOnly ? 'graph-highlight-origins-only' : null,
        ]
          .filter(Boolean)
          .join(' '),
      [highlightOriginsOnly, isPanTool]
    );

    const fullscreenContainerCss = css`
      &:fullscreen {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: ${euiTheme.colors.backgroundBasePlain};

        .react-flow {
          flex: 1;
          min-height: 0;
          width: 100%;
        }
      }
    `;

    const overlayPortalCss = css`
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: ${euiTheme.levels.menu};
      overflow: visible;
    `;

    const fullscreenContextValue = useMemo(
      () => ({
        isFullscreen,
        overlayContainerRef,
      }),
      [isFullscreen]
    );

    return (
      <GraphInteractionToolContext.Provider value={interactionToolContextValue}>
        <GraphFullscreenContext.Provider value={fullscreenContextValue}>
        <div
          ref={graphContainerRef}
          css={[fullscreenContainerCss, containerCss]}
          {...rest}
          tabIndex={interactive ? -1 : undefined}
          onPointerDown={handleGraphPointerDown}
        >
          <SvgDefsMarker />
          <ReactFlow
            key={reactFlowKey}
            data-test-subj={GRAPH_ID}
            className={reactFlowClassName}
            fitView={true}
            fitViewOptions={interactive ? undefined : nonInteractiveFitViewOptions}
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
            panOnDrag={canDragInteract && isPanTool}
            panActivationKeyCode={null}
            selectionOnDrag={isSelectTool}
            selectionMode={SelectionMode.Partial}
            selectionKeyCode={isPanTool ? null : 'Shift'}
            multiSelectionKeyCode={isPanTool ? null : undefined}
            selectNodesOnDrag={isSelectTool}
            elementsSelectable={isSelectTool}
            zoomOnScroll={isGraphInteractive && !isLocked}
            zoomOnPinch={isGraphInteractive && !isLocked}
            zoomOnDoubleClick={isGraphInteractive && !isLocked}
            preventScrolling={interactive}
            nodesDraggable={interactive && isSelectTool}
            maxZoom={1.3}
            minZoom={0.1}
          >
            <GraphSelectionHandlers />
            <ZoomNodeInternalsSync />
            {interactive && (
              <Panel
                position="bottom-right"
                style={{ marginRight: CONTROL_PANEL_MARGIN_RIGHT, overflow: 'visible' }}
              >
                <Controls
                  fitViewOptions={fitViewOptions}
                  nodeIdsToCenterOn={originNodeIds}
                  isFullScreen={isFullscreen}
                  onToggleFullScreen={onToggleFullScreen}
                />
              </Panel>
            )}
            {children}
            <Background id={backgroundId} />
            {interactive && showMinimap && (
              <Minimap zoomable={!isLocked} pannable={!isLocked} nodesState={nodesState} />
            )}
          </ReactFlow>
          <GlobalGraphStyles />
          <div ref={overlayContainerRef} css={overlayPortalCss} data-test-subj="graphFullscreenOverlay" />
        </div>
        </GraphFullscreenContext.Provider>
      </GraphInteractionToolContext.Provider>
    );
  }
);

Graph.displayName = 'Graph';

const processGraph = (
  nodesModel: NodeViewModel[],
  edgesModel: EdgeViewModel[],
  interactive: boolean,
  highlightOriginsOnly: boolean
): {
  initialNodes: Array<Node<NodeViewModel>>;
  initialEdges: Array<Edge<EdgeViewModel>>;
} => {
  const nodesById: { [key: string]: NodeViewModel } = {};

  const initialNodes = nodesModel.map((nodeData) => {
    nodesById[nodeData.id] = nodeData;

    const classNames = [
      interactive ? undefined : 'non-interactive',
      highlightOriginsOnly && isOriginEntityOrEventNode(nodeData)
        ? GRAPH_ORIGIN_NODE_CLASS
        : undefined,
    ].filter(Boolean);

    const node: Node<NodeViewModel> = {
      id: nodeData.id,
      type: nodeData.shape,
      data: {
        ...nodeData,
        interactive,
        highlightAsOrigin: highlightOriginsOnly && isOriginEntityOrEventNode(nodeData),
      },
      position: { x: 0, y: 0 }, // Default position, should be updated later
      className: classNames.length > 0 ? classNames.join(' ') : undefined,
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
    }

    return node;
  });

  const initialEdges: Array<Edge<EdgeViewModel>> = edgesModel
    .map((edgeData) => mapEdgeViewModelToReactFlowEdge(edgeData, nodesById))
    .filter((edge): edge is Edge<EdgeViewModel> => edge !== null);

  return { initialNodes, initialEdges };
};

const isArrayOfObjectsEqual = (x: object[], y: object[]) =>
  size(x) === size(y) && isEmpty(xorWith(x, y, isEqual));

const hasSameGraphStructure = (
  nextNodes: NodeViewModel[],
  prevNodes: NodeViewModel[],
  nextEdges: EdgeViewModel[],
  prevEdges: EdgeViewModel[]
): boolean => {
  if (nextNodes.length !== prevNodes.length || nextEdges.length !== prevEdges.length) {
    return false;
  }

  const prevNodeIds = new Set(prevNodes.map((node) => node.id));
  if (nextNodes.some((node) => !prevNodeIds.has(node.id))) {
    return false;
  }

  const prevEdgeIds = new Set(prevEdges.map((edge) => edge.id));
  if (nextEdges.some((edge) => !prevEdgeIds.has(edge.id))) {
    return false;
  }

  return true;
};
