/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import type { Edge, Node, NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getAlertSeverityColor } from './common';
import type { IntelligenceEntity } from './common';
import type { TimeRangePreset } from './graph_state';
import type { RelatedEntity } from './hooks/use_entity_relationships';
import { useAttackPath } from './hooks/use_attack_path';
import { layoutAttackPathGraph, isEntityNodeData, isResourceNodeData } from './attack_path_layout';
import type { EntityNodeData, ResourceNodeData } from './attack_path_layout';
import { attackPathNodeTypes, crownJewelIcon, nodeKindColor } from './attack_path_nodes';
import { attackPathEdgeTypes, ATTACK_PATH_EDGE_TYPE } from './attack_path_edges';
import type { AttackPathEdgeData } from './attack_path_edges';
import { computeFocusSet } from './attack_path_model';
import type { CrownJewelLeaf, SpineNode } from './attack_path_model';

const ALL_TIME_RANGES: readonly TimeRangePreset[] = ['24h', '7d', '30d', '90d'];

const crownJewelLabel = (kind: CrownJewelLeaf['kind']): string => {
  switch (kind) {
    case 'data-store':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathJewelStore',
        { defaultMessage: 'Data store' }
      );
    case 'exfil-destination':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathJewelExfil',
        { defaultMessage: 'External destination' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathJewelSensitive',
        { defaultMessage: 'Sensitive asset' }
      );
  }
};

export interface AttackPathStorylineProps {
  entity: IntelligenceEntity;
  /** Open a spine entity in the dossier (reuses the graph's inspect wiring). */
  onInspectEntity: (related: RelatedEntity) => void;
  /** Called when a node's evidence/selection opens (host clears the dossier). */
  onEvidenceOpen: () => void;
  /** Notifies the host when the time range changes (for the side panels). */
  onTimeRangeChange?: (timeRange: TimeRangePreset) => void;
  /** Node key (`<kind>:<name>`) to pulse from an external (timeline) hover. */
  highlightedNodeKey?: string;
  /** Reports the hovered node key back to the host for cross-highlighting. */
  onNodeHighlight?: (key: string | undefined) => void;
  /** External request to focus/select a node by key (nonce forces re-fire). */
  focusNodeRequest?: { key: string; nonce: number };
  /** Opens the shared AI explain flyout with a prompt + subtitle. */
  onExplain?: (prompt: string, subtitle: string) => void;
  isExternalDrawerOpen: boolean;
}

/** Converts a spine node to the RelatedEntity shape the dossier expects. */
const toRelatedEntity = (node: SpineNode): RelatedEntity | undefined => {
  if (node.kind === 'origin') return undefined;
  return {
    id: node.id,
    name: node.name,
    kind: node.kind as RelatedEntity['kind'],
    alertCount: node.alertCount,
    worstSeverity: node.worstSeverity,
    context: { activities: [], totalEvents: 0, dominant: undefined },
  };
};

type AttackPathFlowNode = Node<EntityNodeData | ResourceNodeData>;
type AttackPathFlowEdge = Edge<AttackPathEdgeData>;

const renderCommandBar = ({
  euiTheme,
  search,
  setSearch,
  timeRange,
  setTimeRange,
  runExplain,
  onFit,
}: {
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
  search: string;
  setSearch: (value: string) => void;
  timeRange: TimeRangePreset;
  setTimeRange: (value: TimeRangePreset) => void;
  runExplain: () => void;
  onFit: () => void;
}) => (
  <div
    css={css`
      position: absolute;
      z-index: 6;
      top: ${euiTheme.size.m};
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      max-width: calc(100% - 96px);
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      border: ${euiTheme.border.thin};
      border-radius: 999px;
      background: ${transparentize(euiTheme.colors.backgroundBasePlain, 0.94)};
      box-shadow: ${euiTheme.shadows.m};
      backdrop-filter: blur(16px);
    `}
    role="toolbar"
  >
    <EuiFieldSearch
      compressed
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      placeholder={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathFindNode',
        { defaultMessage: 'Find node' }
      )}
      css={css`
        width: min(240px, 28vw);
      `}
    />
    <EuiSelect
      compressed
      value={timeRange}
      onChange={(event) => setTimeRange(event.target.value as TimeRangePreset)}
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathTimeRange',
        { defaultMessage: 'Correlated activity time range' }
      )}
      options={ALL_TIME_RANGES.map((value) => ({ value, text: value }))}
    />
    <EuiButton
      size="s"
      iconType="sparkles"
      onClick={runExplain}
      data-test-subj="entityIntelligenceAttackPathExplain"
    >
      {i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathExplainButton',
        { defaultMessage: 'Explain this' }
      )}
    </EuiButton>
    <EuiToolTip
      content={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathFit',
        { defaultMessage: 'Fit to view' }
      )}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="fullScreen"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathFit',
          { defaultMessage: 'Fit to view' }
        )}
        onClick={onFit}
      />
    </EuiToolTip>
  </div>
);

const renderLeafDetail = ({
  euiTheme,
  leaf,
  onClose,
}: {
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
  leaf: CrownJewelLeaf;
  onClose: () => void;
}) => (
  <EuiPanel
    paddingSize="m"
    hasShadow
    css={css`
      width: 300px;
    `}
    data-test-subj="entityIntelligenceAttackPathLeafDetail"
  >
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={crownJewelIcon(leaf.kind)}
          color={getAlertSeverityColor(euiTheme, leaf.severity)}
          aria-hidden={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="s">
          <strong>{leaf.name}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {crownJewelLabel(leaf.kind)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathLeafClose',
            { defaultMessage: 'Close detail' }
          )}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="cross"
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathLeafClose',
              { defaultMessage: 'Close detail' }
            )}
            onClick={onClose}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiHorizontalRule margin="s" />
    <EuiText size="xs">
      <p>{leaf.reason}</p>
    </EuiText>
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      wrap
      css={css`
        margin-top: ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathLeafReachedFrom',
            { defaultMessage: 'Associated with {name}', values: { name: leaf.reachedFrom } }
          )}
        </EuiBadge>
      </EuiFlexItem>
      {leaf.alertCount > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathLeafAlerts',
              {
                defaultMessage: '{count, plural, one {# alert} other {# alerts}} on parent',
                values: { count: leaf.alertCount },
              }
            )}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  </EuiPanel>
);

const renderLegend = ({
  euiTheme,
  isExternalDrawerOpen,
}: {
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'];
  isExternalDrawerOpen: boolean;
}) => (
  <div
    css={css`
      position: absolute;
      z-index: 6;
      right: ${isExternalDrawerOpen ? '416px' : euiTheme.size.m};
      bottom: ${euiTheme.size.s};
      max-width: 260px;
      padding: ${euiTheme.size.s};
      border: ${euiTheme.border.thin};
      border-radius: ${euiTheme.border.radius.medium};
      background: ${transparentize(euiTheme.colors.backgroundBasePlain, 0.92)};
      box-shadow: ${euiTheme.shadows.s};
      backdrop-filter: blur(12px);
    `}
    data-test-subj="entityIntelligenceAttackPathLegend"
  >
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="graphApp" size="s" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="xs" color="subdued">
          <strong>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathLegendTitle',
              { defaultMessage: 'Correlated activity' }
            )}
          </strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiText size="xs" color="subdued">
      <p
        css={css`
          margin-top: ${euiTheme.size.xs};
        `}
      >
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathLegendBody',
          {
            defaultMessage:
              'Connections show shared alert or event evidence with the focus entity. They do not establish an attack sequence. Tactic labels come only from matching alerts; chips show observed findings. Click a node to inspect its evidence.',
          }
        )}
      </p>
    </EuiText>
  </div>
);

/** Displays observed correlations with evidence-supported tactics and resource context. */
const AttackPathStorylineInner: React.FC<AttackPathStorylineProps> = ({
  entity,
  onInspectEntity,
  onEvidenceOpen,
  onTimeRangeChange,
  highlightedNodeKey,
  onNodeHighlight,
  focusNodeRequest,
  onExplain,
  isExternalDrawerOpen,
}) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView } = useReactFlow();
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('30d');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [leafDetail, setLeafDetail] = useState<CrownJewelLeaf | undefined>();
  const [search, setSearch] = useState('');

  const { path, isLoading, isError, refetch } = useAttackPath({ entity, timeRange });

  useEffect(() => {
    onTimeRangeChange?.(timeRange);
  }, [onTimeRangeChange, timeRange]);

  useEffect(() => {
    setSelectedNodeId(undefined);
    setLeafDetail(undefined);
  }, [entity.id, timeRange]);

  const spine = useMemo(() => path?.spine ?? [], [path]);

  // External focus request (from the timeline) → select the matching node.
  const lastFocusNonce = useRef<number | undefined>();
  useEffect(() => {
    if (!focusNodeRequest || focusNodeRequest.nonce === lastFocusNonce.current) return;
    lastFocusNonce.current = focusNodeRequest.nonce;
    const match = spine.find((node) => node.id === focusNodeRequest.key);
    if (match) setSelectedNodeId(match.id);
  }, [focusNodeRequest, spine]);

  // Pure dagre LR layout of the grounded model.
  const layout = useMemo(() => (path ? layoutAttackPathGraph(path) : undefined), [path]);

  // Click-to-focus: highlight the selected node's path, dim the rest.
  const focusSet = useMemo(
    () => computeFocusSet(spine, path?.crownJewels ?? [], selectedNodeId),
    [path, selectedNodeId, spine]
  );
  const hasFocus = focusSet.dimmed.size > 0;
  const highlightKeyForFocus = useCallback(
    (id: string): EntityNodeData['focusState'] => {
      if (!hasFocus && id !== highlightedNodeKey) return 'none';
      if (focusSet.dimmed.has(id)) return 'dimmed';
      if (focusSet.highlighted.has(id) || id === highlightedNodeKey) return 'highlighted';
      return hasFocus ? 'dimmed' : 'none';
    },
    [focusSet, hasFocus, highlightedNodeKey]
  );

  const searchMatch = search.trim().toLowerCase();

  const [nodes, setNodes, onNodesChange] = useNodesState<AttackPathFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AttackPathFlowEdge>([]);

  // Build React Flow nodes/edges from the layout, decorated with focus + search.
  useEffect(() => {
    if (!layout) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const flowNodes: AttackPathFlowNode[] = layout.nodes.map((laid) => {
      const focusState = highlightKeyForFocus(laid.id);
      const searchHit =
        searchMatch !== '' &&
        ((isEntityNodeData(laid.data) &&
          laid.data.spine.name.toLowerCase().includes(searchMatch)) ||
          (isResourceNodeData(laid.data) &&
            laid.data.leaf.name.toLowerCase().includes(searchMatch)));
      return {
        id: laid.id,
        type: laid.type,
        position: laid.position,
        width: laid.width,
        height: laid.height,
        selected: laid.id === selectedNodeId || searchHit,
        data: { ...laid.data, focusState },
      };
    });
    const flowEdges: AttackPathFlowEdge[] = layout.edges.map((laid) => ({
      id: laid.id,
      source: laid.source,
      target: laid.target,
      type: ATTACK_PATH_EDGE_TYPE,
      data: {
        kind: laid.kind,
        label: laid.label,
        severity: laid.severity,
        dimmed: hasFocus && (focusSet.dimmed.has(laid.source) || focusSet.dimmed.has(laid.target)),
      },
    }));
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [
    layout,
    highlightKeyForFocus,
    searchMatch,
    selectedNodeId,
    hasFocus,
    focusSet,
    setNodes,
    setEdges,
  ]);

  const nodeById = useMemo(() => new Map(spine.map((node) => [node.id, node])), [spine]);

  const selectSpineNode = useCallback(
    (node: SpineNode) => {
      setSelectedNodeId(node.id);
      setLeafDetail(undefined);
      onNodeHighlight?.(node.kind === 'origin' ? undefined : node.id);
      const related = toRelatedEntity(node);
      if (related) {
        onEvidenceOpen();
        onInspectEntity(related);
      }
    },
    [onEvidenceOpen, onInspectEntity, onNodeHighlight]
  );

  const handleNodeClick = useCallback<NodeMouseHandler<AttackPathFlowNode>>(
    (_event, node) => {
      if (isResourceNodeData(node.data)) {
        setSelectedNodeId(node.id);
        setLeafDetail(node.data.leaf);
        onNodeHighlight?.(undefined);
        return;
      }
      const spineNode = nodeById.get(node.id);
      if (spineNode) selectSpineNode(spineNode);
    },
    [nodeById, onNodeHighlight, selectSpineNode]
  );

  const handleNodeMouseEnter = useCallback<NodeMouseHandler<AttackPathFlowNode>>(
    (_event, node) => {
      if (isResourceNodeData(node.data)) {
        onNodeHighlight?.(node.data.leaf.nodeId);
      } else if (node.data.spine.kind !== 'origin') {
        onNodeHighlight?.(node.id);
      }
    },
    [onNodeHighlight]
  );

  const handleNodeMouseLeave = useCallback(() => onNodeHighlight?.(undefined), [onNodeHighlight]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(undefined);
    setLeafDetail(undefined);
    onNodeHighlight?.(undefined);
  }, [onNodeHighlight]);

  const runExplain = useCallback(() => {
    if (!path) return;
    const spineNames = path.spine.map((node) => node.name).join(', ');
    const stageLine = path.stages.map((band) => band.label).join(', ');
    const jewels = path.crownJewels.map((jewel) => `${jewel.name} (${jewel.reason})`).join('; ');
    const findings = path.annotations
      .slice(0, 8)
      .map((annotation) => `- [${annotation.kind}] ${annotation.text}`)
      .join('\n');
    const prompt = [
      'You are a senior SOC analyst. Explain this correlated-activity graph and suggest the next evidence to investigate. Connections represent co-occurrence with the focus entity, not a causal sequence. Do not infer lateral movement, exfiltration, or attacker progression from graph position or shared alerts. Ground every statement ONLY in the context below; never invent specifics.',
      '',
      'CONTEXT',
      `Correlated entities: ${spineNames}`,
      stageLine ? `Observed alert tactics: ${stageLine}` : '',
      jewels ? `Resource evidence: ${jewels}` : '',
      findings ? `Findings:\n${findings}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    onExplain?.(
      prompt,
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathExplainSubtitle',
        { defaultMessage: 'Correlated activity · {name}', values: { name: entity.name } }
      )
    );
  }, [entity.name, onExplain, path]);

  const minimapNodeColor = useCallback(
    (node: AttackPathFlowNode): string => {
      if (isResourceNodeData(node.data))
        return getAlertSeverityColor(euiTheme, node.data.leaf.severity);
      const { spine: spineNode } = node.data;
      return spineNode.worstSeverity && spineNode.kind !== 'origin'
        ? getAlertSeverityColor(euiTheme, spineNode.worstSeverity)
        : nodeKindColor(euiTheme, spineNode.kind);
    },
    [euiTheme]
  );

  return (
    <div
      css={css`
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 520px;
      `}
      data-test-subj="entityIntelligenceAttackPath"
    >
      {renderCommandBar({
        euiTheme,
        search,
        setSearch,
        timeRange,
        setTimeRange,
        runExplain,
        onFit: () => fitView({ padding: 0.2, duration: 300 }),
      })}

      {isError ? (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathError',
            { defaultMessage: 'The correlated activity could not be loaded.' }
          )}
          css={css`
            position: absolute;
            top: 45%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 6;
          `}
        >
          <EuiButtonEmpty size="s" onClick={refetch}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathRetry',
              { defaultMessage: 'Retry' }
            )}
          </EuiButtonEmpty>
        </EuiCallOut>
      ) : null}

      {isLoading && !path ? (
        <div
          css={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 5;
          `}
        >
          <EuiLoadingSpinner size="xl" />
        </div>
      ) : null}

      {path?.isSparse ? (
        <div
          css={css`
            position: absolute;
            z-index: 5;
            left: 50%;
            bottom: ${euiTheme.size.xl};
            transform: translateX(-50%);
            max-width: 360px;
            text-align: center;
          `}
          data-test-subj="entityIntelligenceAttackPathSparse"
        >
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathSparse',
                {
                  defaultMessage:
                    'No correlated activity found for {name} in the last {timeRange}.',
                  values: { name: entity.name, timeRange },
                }
              )}
            </p>
          </EuiText>
        </div>
      ) : null}

      <ReactFlow<AttackPathFlowNode, AttackPathFlowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={attackPathNodeTypes}
        edgeTypes={attackPathEdgeTypes}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onPaneClick={handlePaneClick}
        colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          color={transparentize(euiTheme.colors.borderBasePlain, 0.6)}
        />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          position="bottom-left"
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={0}
          nodeBorderRadius={4}
          maskColor={transparentize(euiTheme.colors.backgroundBaseSubdued, 0.7)}
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          style={{ width: 150, height: 110 }}
        />
        {leafDetail ? (
          <Panel position="top-right">
            {renderLeafDetail({
              euiTheme,
              leaf: leafDetail,
              onClose: () => setLeafDetail(undefined),
            })}
          </Panel>
        ) : null}
      </ReactFlow>

      {renderLegend({ euiTheme, isExternalDrawerOpen })}
    </div>
  );
};

export const AttackPathStoryline: React.FC<AttackPathStorylineProps> = (props) => (
  <ReactFlowProvider>
    <AttackPathStorylineInner {...props} />
  </ReactFlowProvider>
);
