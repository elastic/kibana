/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCheckboxGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  features,
  queries,
  detections,
  significantEvents as rawSignificantEvents,
} from '../fixtures';
import type { FixtureFeature, FixtureSignificantEvent } from '../fixtures';
import { KiNode } from './ki_node';
import { NodeDetailFlyout, type NearbyEvent } from './node_detail_flyout';
import { buildGraphElements } from './graph_data';
import { applyDagreLayout } from './layout_graph';
import {
  computeCorrelationEdges,
  correlationEdgeColor,
  correlationStrokeWidth,
} from './correlation_edges';
import type { KiNodeData, TypeFilters, VisibleFeatureType } from './types';

const nodeTypes = { kiNode: KiNode };

const FILTER_OPTIONS: Array<{ id: VisibleFeatureType; label: string }> = [
  { id: 'entity', label: 'Entities' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'technology', label: 'Technology' },
  { id: 'schema', label: 'Schema' },
];

const defaultFilters: TypeFilters = {
  entity: true,
  infrastructure: false,
  technology: false,
  schema: false,
};

// Build query title lookup once for sig event resolution
const queryByTitle = new Map(queries.map((q) => [q.title, q]));

// Filter out low-criticality events (data quality threshold per Carlos)
const significantEvents = rawSignificantEvents.filter((e) => e.criticality >= 50);

function computeHeat(featureId: string): { detectionCount: number; maxSeverity: number } {
  const feature = features.find((f) => f.id === featureId);
  if (!feature) return { detectionCount: 0, maxSeverity: 0 };

  const relatedDetections = detections.filter((d) => d.stream_name === feature.stream_name);

  // Find sig events linked to this KI through any path
  const activeEvents = significantEvents.filter((e) => {
    if (e.status !== 'promoted' && e.status !== 'acknowledged') return false;
    // Path 1: cause_ki_ids
    if (e.cause_ki_ids.includes(featureId)) return true;
    // Path 2: dependency_edges
    if (e.dependency_edges?.some((edge) => edge.source === featureId || edge.target === featureId)) return true;
    // Path 3: rule_names → queries → feature_ids
    if (e.rule_names?.some((name) => {
      const q = queryByTitle.get(name);
      return q?.feature_ids.includes(featureId);
    })) return true;
    return false;
  });

  const maxSeverity = activeEvents.length > 0
    ? Math.max(...activeEvents.map((e) => e.criticality))
    : 0;

  return { detectionCount: relatedDetections.length, maxSeverity };
}

function heatToColor(heat: { detectionCount: number; maxSeverity: number }): string {
  // Red for high-severity sig events (criticality 60+)
  if (heat.maxSeverity >= 75) return 'hsl(0, 80%, 50%)';
  if (heat.maxSeverity >= 60) return 'hsl(10, 70%, 55%)';
  // Amber/yellow for detections only
  if (heat.detectionCount >= 5) return 'hsl(35, 90%, 50%)';
  if (heat.detectionCount >= 2) return 'hsl(45, 80%, 55%)';
  if (heat.detectionCount >= 1) return 'hsl(50, 60%, 55%)';
  return '';
}

interface KnowledgeGraphViewProps {
  onEventClick?: (event: FixtureSignificantEvent) => void;
}

function KnowledgeGraphInner({ onEventClick }: KnowledgeGraphViewProps) {
  const { euiTheme } = useEuiTheme();
  const reactFlow = useReactFlow();
  const [filters, setFilters] = useState<TypeFilters>(defaultFilters);
  const [selectedFeature, setSelectedFeature] = useState<FixtureFeature | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<KiNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [heatMode, setHeatMode] = useState(false);
  const [correlationMode, setCorrelationMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FixtureFeature[]>([]);

  const typeColors = useMemo(
    () => ({
      entity: { fill: euiTheme.colors.primary, border: euiTheme.colors.primary },
      infrastructure: { fill: euiTheme.colors.success, border: euiTheme.colors.success },
      technology: { fill: euiTheme.colors.accent, border: euiTheme.colors.accent },
      schema: { fill: euiTheme.colors.subduedText, border: euiTheme.colors.subduedText },
    }),
    [euiTheme]
  );

  const heatScores = useMemo(() => {
    const scores = new Map<string, { detectionCount: number; maxSeverity: number }>();
    features.forEach((f) => {
      if (f.type !== 'dependency') {
        scores.set(f.id, computeHeat(f.id));
      }
    });
    return scores;
  }, []);


  const graphElements = useMemo(
    () => buildGraphElements(features, filters, typeColors, selectedFeature?.id ?? null),
    [filters, typeColors, selectedFeature?.id]
  );

  const visibleNodeIds = useMemo(
    () =>
      new Set(
        graphElements.nodes
          .filter((node) => !node.data.isPhantom)
          .map((node) => node.id)
      ),
    [graphElements.nodes]
  );

  // Adjacency map for BFS traversal (undirected)
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    graphElements.edges.forEach((edge) => {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    });
    return map;
  }, [graphElements.edges]);

  const correlationEdges = useMemo(() => {
    if (!correlationMode) return [];
    return computeCorrelationEdges(
      visibleNodeIds,
      features,
      queries,
      detections,
      significantEvents
    );
  }, [correlationMode, visibleNodeIds]);

  useEffect(() => {
    if (selectedFeature && !filters[selectedFeature.type as VisibleFeatureType]) {
      setSelectedFeature(null);
    }
  }, [filters, selectedFeature]);

  // Compute set of node IDs connected to the selected node (for dimming)
  const connectedNodeIds = useMemo(() => {
    if (!selectedFeature) return null;
    const connected = new Set<string>([selectedFeature.id]);
    graphElements.edges.forEach((edge) => {
      if (edge.source === selectedFeature.id) connected.add(edge.target);
      if (edge.target === selectedFeature.id) connected.add(edge.source);
    });
    if (correlationMode) {
      correlationEdges.forEach((edge) => {
        if (edge.source === selectedFeature.id) connected.add(edge.target);
        if (edge.target === selectedFeature.id) connected.add(edge.source);
      });
    }
    return connected;
  }, [selectedFeature, graphElements.edges, correlationMode, correlationEdges]);

  // BFS to depth 2: find nodes within 1 and 2 hops for nearby sig event discovery
  const { hop1Ids, hop2Ids } = useMemo(() => {
    if (!selectedFeature) return { hop1Ids: new Set<string>(), hop2Ids: new Set<string>() };
    const hop1 = new Set<string>();
    const hop2 = new Set<string>();
    const neighbors = adjacencyMap.get(selectedFeature.id);
    if (neighbors) {
      for (const n of neighbors) {
        hop1.add(n);
        const secondNeighbors = adjacencyMap.get(n);
        if (secondNeighbors) {
          for (const nn of secondNeighbors) {
            if (nn !== selectedFeature.id && !hop1.has(nn)) {
              hop2.add(nn);
            }
          }
        }
      }
    }
    return { hop1Ids: hop1, hop2Ids: hop2 };
  }, [selectedFeature, adjacencyMap]);

  // Compute layout ONCE when graph elements change (not on selection/mode changes)
  const laidOutNodes = useMemo(
    () => applyDagreLayout(graphElements.nodes, graphElements.edges),
    [graphElements]
  );

  useEffect(() => {
    const finalNodes = laidOutNodes.map((node) => {
      let updatedData = { ...node.data };

      if (heatMode) {
        const heat = heatScores.get(node.id) || { detectionCount: 0, maxSeverity: 0 };
        const heatColor = heatToColor(heat);
        if (heatColor) {
          updatedData = { ...updatedData, color: heatColor, borderColor: heatColor };
        }
      }

      if (connectedNodeIds && !connectedNodeIds.has(node.id)) {
        updatedData = { ...updatedData, dimmed: true };
      } else {
        updatedData = { ...updatedData, dimmed: false };
      }

      return { ...node, data: updatedData };
    });

    const styledDependencyEdges = graphElements.edges.map((edge) => {
      const isConnected = connectedNodeIds
        ? connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)
        : true;
      const baseOpacity = correlationMode ? 0.45 : 0.7;
      return {
        ...edge,
        zIndex: 0,
        focusable: false,
        interactionWidth: 0,
        style: {
          ...edge.style,
          stroke: isConnected ? euiTheme.colors.primary : euiTheme.colors.mediumShade,
          strokeWidth: isConnected && connectedNodeIds ? 2 : 1,
          opacity: isConnected ? baseOpacity : 0.12,
          pointerEvents: 'none' as const,
        },
        animated: isConnected && !!connectedNodeIds,
      };
    });

    const styledCorrelationEdges = correlationMode
      ? correlationEdges.map((edge) => {
          const isConnected = connectedNodeIds
            ? connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)
            : true;
          const strokeColor = correlationEdgeColor(edge, {
            warning: euiTheme.colors.warning,
            danger: euiTheme.colors.danger,
          });
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'straight' as const,
            zIndex: 0,
            focusable: false,
            interactionWidth: 0,
            animated: false,
            style: {
              stroke: strokeColor,
              strokeWidth: correlationStrokeWidth(edge),
              strokeDasharray: '4 3',
              opacity: isConnected ? 0.5 : 0.1,
              pointerEvents: 'none' as const,
            },
          };
        })
      : [];

    setNodes(finalNodes);
    setEdges(correlationMode ? styledCorrelationEdges : styledDependencyEdges);
  }, [
    laidOutNodes,
    graphElements.edges,
    setNodes,
    setEdges,
    euiTheme,
    heatMode,
    heatScores,
    connectedNodeIds,
    correlationMode,
    correlationEdges,
  ]);

  const centerOnNode = useCallback((nodeId: string) => {
    const stableNode = laidOutNodes.find((n) => n.id === nodeId);
    if (!stableNode) return;
    const x = stableNode.position.x + (stableNode.data?.width || 40) / 2;
    const y = stableNode.position.y + (stableNode.data?.height || 40) / 2;
    // Double-raf ensures React Flow has committed layout before we animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reactFlow.setCenter(x, y, { zoom: 1.8, duration: 400 });
      });
    });
  }, [reactFlow, laidOutNodes]);

  // Click-to-center-and-zoom
  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const clickedNode = node as Node<KiNodeData>;
    setSelectedFeature(clickedNode.data.feature);
    centerOnNode(clickedNode.id);
  }, [centerOnNode]);

  const connectedFeatures = useMemo(() => {
    if (!selectedFeature || !connectedNodeIds) return [];
    return features.filter(
      (f) => f.id !== selectedFeature.id && connectedNodeIds.has(f.id) && f.type !== 'dependency'
    );
  }, [selectedFeature, connectedNodeIds]);

  const selectedQueries = useMemo(() => {
    if (!selectedFeature) return [];
    return queries.filter(
      (q) => q.feature_ids.includes(selectedFeature.id) || q.stream_name === selectedFeature.stream_name
    );
  }, [selectedFeature]);

  const selectedDetections = useMemo(() => {
    if (!selectedFeature) return [];
    return detections.filter((d) => d.stream_name === selectedFeature.stream_name);
  }, [selectedFeature]);

  const isEventLinkedToNode = useCallback((event: FixtureSignificantEvent, nodeId: string) => {
    if (event.cause_ki_ids.includes(nodeId)) return true;
    if (event.dependency_edges?.some((edge) => edge.source === nodeId || edge.target === nodeId)) return true;
    if (event.rule_names?.some((name) => {
      const q = queryByTitle.get(name);
      return q?.feature_ids.includes(nodeId);
    })) return true;
    return false;
  }, []);

  const selectedEvents = useMemo(() => {
    if (!selectedFeature) return [];
    const statusRank = (s: string) =>
      s === 'promoted' ? 0 : s === 'acknowledged' ? 1 : s === 'resolved' ? 2 : 3;
    return significantEvents
      .filter((e) => {
        if (e.status === 'demoted' || e.status === 'closed') return false;
        return isEventLinkedToNode(e, selectedFeature.id);
      })
      .sort((a, b) => b.criticality - a.criticality || statusRank(a.status) - statusRank(b.status));
  }, [selectedFeature, isEventLinkedToNode]);

  // Nearby sig events: linked to nodes within 2 hops but NOT to the selected node directly
  const nearbyEvents = useMemo(() => {
    if (!selectedFeature || (hop1Ids.size === 0 && hop2Ids.size === 0)) return [];
    const directEventIds = new Set(selectedEvents.map((e) => e.event_id));
    const statusRank = (s: string) =>
      s === 'promoted' ? 0 : s === 'acknowledged' ? 1 : s === 'resolved' ? 2 : 3;

    const nearby: NearbyEvent[] = [];
    const seenEventIds = new Set<string>();

    const checkHop = (nodeIds: Set<string>, hopDist: number) => {
      for (const nodeId of nodeIds) {
        for (const event of significantEvents) {
          if (event.status === 'demoted' || event.status === 'closed') continue;
          if (directEventIds.has(event.event_id)) continue;
          if (seenEventIds.has(event.event_id)) continue;
          if (isEventLinkedToNode(event, nodeId)) {
            seenEventIds.add(event.event_id);
            nearby.push({ ...event, viaNodeId: nodeId, hopDistance: hopDist });
          }
        }
      }
    };

    checkHop(hop1Ids, 1);
    checkHop(hop2Ids, 2);

    return nearby.sort((a, b) => b.criticality - a.criticality || statusRank(a.status) - statusRank(b.status));
  }, [selectedFeature, selectedEvents, hop1Ids, hop2Ids, isEventLinkedToNode]);

  // In correlation mode, find which sig events / detections are shared with correlated neighbors
  const { sharedEventIds, sharedDetectionIds, correlatedNodeIds: corrNodes } = useMemo(() => {
    if (!correlationMode || !selectedFeature || correlationEdges.length === 0) {
      return { sharedEventIds: undefined, sharedDetectionIds: undefined, correlatedNodeIds: undefined };
    }

    const neighborIds = new Set<string>();
    for (const edge of correlationEdges) {
      if (edge.source === selectedFeature.id) neighborIds.add(edge.target);
      if (edge.target === selectedFeature.id) neighborIds.add(edge.source);
    }
    if (neighborIds.size === 0) {
      return { sharedEventIds: undefined, sharedDetectionIds: undefined, correlatedNodeIds: undefined };
    }

    const sharedEvents = new Set<string>();
    const sharedDets = new Set<string>();

    for (const event of significantEvents) {
      if (event.status === 'demoted' || event.status === 'closed') continue;
      if (!isEventLinkedToNode(event, selectedFeature.id)) continue;
      for (const nid of neighborIds) {
        if (isEventLinkedToNode(event, nid)) {
          sharedEvents.add(event.event_id);
          break;
        }
      }
    }

    // For detections: shared if on the same stream as selected AND a correlated neighbor
    const selectedStream = selectedFeature.stream_name;
    const neighborStreams = new Set(
      [...neighborIds]
        .map((id) => features.find((f) => f.id === id)?.stream_name)
        .filter(Boolean)
    );
    if (neighborStreams.has(selectedStream)) {
      for (const det of detections) {
        if (det.stream_name === selectedStream) {
          sharedDets.add(det.rule_uuid);
        }
      }
    }

    return {
      sharedEventIds: sharedEvents.size > 0 ? sharedEvents : undefined,
      sharedDetectionIds: sharedDets.size > 0 ? sharedDets : undefined,
      correlatedNodeIds: neighborIds,
    };
  }, [correlationMode, selectedFeature, correlationEdges, isEventLinkedToNode]);

  const checkboxIdToSelectedMap = useMemo(
    () => Object.fromEntries(FILTER_OPTIONS.map(({ id }) => [id, filters[id]])) as Record<string, boolean>,
    [filters]
  );

  return (
    <div css={css`width: 100%; height: 100%; position: relative;`}>
      {/* Floating controls — top left */}
      <div
        css={css`
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 8px;
        `}
      >
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="filter"
              aria-label="Filter node types"
              onClick={() => setFiltersOpen(!filtersOpen)}
              display={filtersOpen ? 'fill' : 'base'}
              size="m"
              css={css`
                background: ${euiTheme.colors.emptyShade};
                border: 1px solid ${euiTheme.colors.lightShade};
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                width: 36px;
                height: 36px;
              `}
            />
          }
          isOpen={filtersOpen}
          closePopover={() => setFiltersOpen(false)}
          anchorPosition="downLeft"
          panelPaddingSize="s"
        >
          <div css={css`padding: 8px; min-width: 180px;`}>
            <EuiText size="xs" color="subdued" css={css`margin-bottom: 8px;`}>
              <strong>Show types</strong>
            </EuiText>
            <EuiCheckboxGroup
              options={FILTER_OPTIONS}
              idToSelectedMap={checkboxIdToSelectedMap}
              onChange={(optionId) => {
                const key = optionId as VisibleFeatureType;
                setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
              }}
              compressed
            />
            <div css={css`margin-top: 12px; padding-top: 12px; border-top: 1px solid ${euiTheme.colors.lightShade};`}>
              <EuiSwitch
                label="Heat map"
                checked={heatMode}
                onChange={() => setHeatMode(!heatMode)}
                compressed
              />
              <div css={css`margin-top: 8px;`}>
                <EuiSwitch
                  label="Correlation"
                  checked={correlationMode}
                  onChange={() => setCorrelationMode(!correlationMode)}
                  compressed
                />
              </div>
            </div>
          </div>
        </EuiPopover>

        {/* Stats badge */}
        <div
          css={css`
            background: ${euiTheme.colors.emptyShade}CC;
            border: 1px solid ${euiTheme.colors.lightShade};
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 11px;
            color: ${euiTheme.colors.subduedText};
          `}
        >
          {nodes.length} nodes · {edges.length} edges
        </div>
      </div>

      {/* Floating search — top right */}
      <div
        css={css`
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 10;
          width: 220px;
        `}
      >
        <EuiFieldSearch
          placeholder="Find node..."
          value={searchQuery}
          onChange={(e) => {
            const q = e.target.value;
            setSearchQuery(q);
            if (q.length >= 2) {
              const lower = q.toLowerCase();
              setSearchResults(
                graphElements.nodes
                  .map((n) => n.data.feature)
                  .filter((f) => f.title.toLowerCase().includes(lower))
                  .slice(0, 8)
              );
            } else {
              setSearchResults([]);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchResults.length > 0) {
              setSelectedFeature(searchResults[0]);
              centerOnNode(searchResults[0].id);
              setSearchQuery('');
              setSearchResults([]);
            }
          }}
          compressed
          isClearable
          css={css`
            background: ${euiTheme.colors.emptyShade};
            border: 1px solid ${euiTheme.colors.lightShade};
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          `}
        />
        {searchResults.length > 0 && (
          <div
            css={css`
              margin-top: 4px;
              background: ${euiTheme.colors.emptyShade};
              border: 1px solid ${euiTheme.colors.lightShade};
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
              overflow: hidden;
            `}
          >
            {searchResults.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedFeature(f);
                  centerOnNode(f.id);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                css={css`
                  display: block;
                  width: 100%;
                  text-align: left;
                  padding: 8px 12px;
                  font-size: 12px;
                  color: ${euiTheme.colors.text};
                  border: none;
                  background: transparent;
                  cursor: pointer;
                  border-bottom: 1px solid ${euiTheme.colors.lightShade};
                  &:last-child { border-bottom: none; }
                  &:hover { background: ${euiTheme.colors.lightestShade}; }
                `}
              >
                <span css={css`font-weight: 600;`}>{f.title}</span>
                <span css={css`margin-left: 8px; font-size: 10px; color: ${euiTheme.colors.subduedText};`}>
                  {f.type}{f.tags?.includes('phantom') ? ' · external' : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => {
          setSelectedFeature(null);
          reactFlow.fitView({ padding: 0.15, duration: 400 });
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={4}
        edgesFocusable={false}
        edgesReconnectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background color={euiTheme.colors.lightShade} gap={30} size={1} />
        <Controls
          showInteractive={false}
          style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
        />
        <MiniMap
          nodeStrokeColor="transparent"
          nodeColor={(node) => {
            const d = node.data as KiNodeData;
            if (d.isPhantom) return euiTheme.colors.mediumShade;
            return d.borderColor || euiTheme.colors.primary;
          }}
          maskColor={`${euiTheme.colors.body}E0`}
          style={{
            backgroundColor: euiTheme.colors.emptyShade,
            border: `1px solid ${euiTheme.colors.lightShade}`,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        />
      </ReactFlow>

      {correlationMode && (
        <div
          css={css`
            position: absolute;
            bottom: 52px;
            left: 16px;
            z-index: 10;
            background: ${euiTheme.colors.emptyShade}B3;
            border: 1px solid ${euiTheme.colors.lightShade};
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 10px;
            color: ${euiTheme.colors.subduedText};
            pointer-events: none;
          `}
        >
          <div css={css`font-weight: 600; margin-bottom: 4px;`}>Correlation</div>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <svg width="20" height="8" aria-hidden="true">
                <line
                  x1="0"
                  y1="4"
                  x2="20"
                  y2="4"
                  stroke={euiTheme.colors.warning}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
              </svg>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>Query / detection</span>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={css`margin-top: 2px;`}>
            <EuiFlexItem grow={false}>
              <svg width="20" height="8" aria-hidden="true">
                <line
                  x1="0"
                  y1="4"
                  x2="20"
                  y2="4"
                  stroke={euiTheme.colors.danger}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
              </svg>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>Significant event</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      )}

      {selectedFeature && (
        <NodeDetailFlyout
          feature={selectedFeature}
          queries={selectedQueries}
          detections={selectedDetections}
          significantEvents={selectedEvents}
          nearbyEvents={nearbyEvents}
          connectedFeatures={connectedFeatures}
          correlatedNodeIds={corrNodes}
          sharedEventIds={sharedEventIds}
          sharedDetectionIds={sharedDetectionIds}
          onClose={() => setSelectedFeature(null)}
          onNavigateToNode={(featureId) => {
            const target = features.find((f) => f.id === featureId);
            if (target) {
              setSelectedFeature(target);
              centerOnNode(featureId);
            }
          }}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

export function KnowledgeGraphView({ onEventClick }: KnowledgeGraphViewProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphInner onEventClick={onEventClick} />
    </ReactFlowProvider>
  );
}
