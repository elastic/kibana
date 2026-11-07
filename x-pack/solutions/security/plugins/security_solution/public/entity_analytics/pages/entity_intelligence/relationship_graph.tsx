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
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import type { IntelligenceEntity } from './common';
import type { EntityGraphSecurity } from './entity_investigation_canvas';
import { FindingDetails } from './security_findings/security_findings_panel';
import { RelationshipAgentNodes } from './relationship_graph_agents';
import {
  buildRelationshipAgentGraph,
  layoutRelationshipAgents,
  RELATIONSHIP_AGENT_HANDOFF_GAP,
  relationshipAgentGraphExplainEvidence,
} from './relationship_graph_agents_model';
import { useEntityAgentSessionTitles } from './use_entity_agent_session_titles';
import {
  entitySecuritySequences,
  filterSecurityFindingsForGraph,
  hasRecordedSecurityOrder,
  layoutSecurityEvents,
  RelationshipSecurityNodes,
  SECURITY_EVENT_WIDTH,
  SECURITY_EVENT_HEIGHT,
} from './relationship_graph_security';
import { getAlertSeverityColor, getRiskLevelColor } from './common';
import {
  BRANCH_VISIBLE_LIMIT,
  GRAPH_NODE_CAP,
  attachGroupNode,
  collapseBranch,
  createGraphState,
  edgeStrokeWidth,
  entityNodeId,
  expandGroup,
  mergeAlertEvidence,
  mergeNeighborhood,
  orderedEntityIdsForNavigation,
  splitNeighborhood,
} from './graph_state';
import type {
  AlertGraphNode,
  EntityGraphNode,
  GraphEntityKind,
  GraphNode,
  GraphState,
  GroupGraphNode,
  RelationshipGraphEdge,
  TimeRangePreset,
} from './graph_state';
import { useAlertEvidence } from './hooks/use_alert_evidence';
import type {
  AlertSeverity,
  RelatedEntity,
  RelationshipEntity,
} from './hooks/use_entity_relationships';
import { useEntityRelationships } from './hooks/use_entity_relationships';
import { edgeDraw, edgeFlow, nodePop } from './animations';
import {
  badgeOffset,
  chooseToolbarPlacement,
  distributeRadial,
  hiddenLabelIds,
  minAngularStep,
} from './graph_layout';
import type { LabelBox, Rect } from './graph_layout';
import {
  activityKindLabel,
  activityPhrase,
  edgeContextSummary,
  EMPTY_EDGE_CONTEXT,
} from './event_context';
import type { EdgeContext } from './event_context';
import { buildGraphExplainPrompt } from './ai_explain';
import type { GraphExplainAlertRule, GraphExplainNeighbor } from './ai_explain';

const previousAgentSessionsLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.graph.previousAgentSessions',
  { defaultMessage: 'Previous agent sessions' }
);
const nextAgentSessionsLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.graph.nextAgentSessions',
  { defaultMessage: 'Next agent sessions' }
);

const MIN_CANVAS_WIDTH = 600;
const MIN_CANVAS_HEIGHT = 620;
const ENTITY_RADIUS = 30;
const ROOT_RADIUS = 39;
const CONTEXT_DRAWER_WIDTH = 400;
const ALL_SEVERITIES: readonly AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
const ALL_ENTITY_KINDS: readonly GraphEntityKind[] = [
  EntityType.user,
  EntityType.host,
  EntityType.service,
  'ip',
];

interface CanvasSize {
  width: number;
  height: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

interface AlertCluster {
  parentId: string;
  alerts: readonly AlertGraphNode[];
}

interface DragGesture {
  pointerId: number;
  startX: number;
  startY: number;
  panX: number;
  panY: number;
  hasMoved: boolean;
}

interface RelationshipGraphProps {
  entity: IntelligenceEntity;
  security?: EntityGraphSecurity;
  onInspectEntity: (related: RelatedEntity) => void;
  onEvidenceOpen: () => void;
  onHuntEntity?: (related: RelatedEntity) => void;
  /** Notifies the host when the graph's time range changes (for side panels). */
  onTimeRangeChange?: (timeRange: TimeRangePreset) => void;
  /** Node key (`<kind>:<name>`) to pulse from an external (timeline) hover. */
  highlightedNodeKey?: string;
  /** Reports the hovered node key back to the host for cross-highlighting. */
  onNodeHighlight?: (key: string | undefined) => void;
  /** External request to focus/select a node by key (nonce forces re-fire). */
  focusNodeRequest?: { key: string; nonce: number };
  agentActivityRequest?: { entityId: string; nonce: number };
  /** Opens the shared AI explain flyout with a prompt + subtitle. */
  onExplain?: (prompt: string, subtitle: string) => void;
  isExternalDrawerOpen: boolean;
}

const COPY = {
  filter: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.filter', {
    defaultMessage: 'Filters',
  }),
  evidence: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.evidence', {
    defaultMessage: 'Evidence',
  }),
  evidenceShow: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.graphEvidenceShow',
    { defaultMessage: 'Show alert evidence' }
  ),
  evidenceHide: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.graphEvidenceHide',
    { defaultMessage: 'Hide alert evidence' }
  ),
  focus: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.focusAction', {
    defaultMessage: 'Focus',
  }),
  expand: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.expandAction', {
    defaultMessage: 'Expand',
  }),
  inspect: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.graph.inspectAction',
    { defaultMessage: 'Inspect' }
  ),
  collapse: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.graph.collapseAction',
    { defaultMessage: 'Collapse branch' }
  ),
  hunt: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.huntAction', {
    defaultMessage: 'Hunt this entity',
  }),
  copy: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.copyAction', {
    defaultMessage: 'Copy value',
  }),
  copied: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.copiedAction',
    { defaultMessage: 'Copied' }
  ),
  retry: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.retryAction', {
    defaultMessage: 'Retry',
  }),
  noEvidence: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.graph.noEvidence',
    { defaultMessage: 'No matching detection alerts were found.' }
  ),
  onboarding: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.graph.onboardingHint',
    {
      defaultMessage: 'Select a node to inspect · Double-click to expand · Ctrl/⌘ + scroll to zoom',
    }
  ),
};

const kindLabel = (kind: GraphEntityKind): string => {
  switch (kind) {
    case EntityType.user:
      return i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.userKind', {
        defaultMessage: 'User',
      });
    case EntityType.host:
      return i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.hostKind', {
        defaultMessage: 'Host',
      });
    case EntityType.service:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.graph.serviceKind',
        { defaultMessage: 'Service' }
      );
    default:
      return i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.graph.ipKind', {
        defaultMessage: 'IP',
      });
  }
};

const nodeIcon = (kind: GraphEntityKind) => (kind === 'ip' ? 'globe' : EntityIconByType[kind]);

/** Localized label for an alert severity, used in the legend swatches. */
const severityLegendLabel = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'critical':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityCritical',
        { defaultMessage: 'Critical' }
      );
    case 'high':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityHigh',
        { defaultMessage: 'High' }
      );
    case 'medium':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityMedium',
        { defaultMessage: 'Medium' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityLow',
        { defaultMessage: 'Low' }
      );
  }
};

/** Resolves a display name for a node id, falling back to the id for group nodes. */
const nodeDisplayName = (nodes: readonly GraphNode[], id: string): string => {
  const node = nodes.find((candidate) => candidate.id === id);
  return node && node.nodeType !== 'group' ? node.name : id;
};

const toRelationshipEntity = (node: EntityGraphNode): RelationshipEntity => ({
  id: node.id,
  name: node.name,
  kind: node.kind,
  identifierValue: node.identifierValue,
});

const toRelatedEntity = (node: EntityGraphNode): RelatedEntity => ({
  id: node.id,
  name: node.name,
  kind: node.kind,
  alertCount: node.alertCount,
  worstSeverity: node.worstSeverity,
  context: node.context,
});

const createRootNode = (entity: IntelligenceEntity): EntityGraphNode => ({
  nodeType: 'entity',
  id: entityNodeId(entity.type as GraphEntityKind, entity.identifierValue),
  name: entity.name,
  identifierValue: entity.identifierValue,
  kind: entity.type as GraphEntityKind,
  parentId: undefined,
  alertCount: 0,
  worstSeverity: undefined,
  riskScore: entity.riskScoreNorm,
  context: EMPTY_EDGE_CONTEXT,
});

const useCanvasSize = (containerRef: React.RefObject<HTMLDivElement>): CanvasSize => {
  const [size, setSize] = useState<CanvasSize>({
    width: MIN_CANVAS_WIDTH,
    height: MIN_CANVAS_HEIGHT,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize({
        width: Math.max(MIN_CANVAS_WIDTH, Math.round(width)),
        height: Math.max(MIN_CANVAS_HEIGHT, Math.round(height)),
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  return size;
};

/**
 * Responsive radial layout. First-generation entities use the full available
 * ring; expanded branches fan outward from their parent so existing branches
 * retain their direction and the analyst's mental map. When a ring is crowded,
 * {@link distributeRadial} enforces a minimum angular separation and spills the
 * overflow onto concentric outer rings, preventing node + badge overlap.
 */
export const layoutGraphNodes = (
  nodes: readonly GraphNode[],
  canvas: CanvasSize = { width: 1200, height: 720 },
  reservedRight = 0,
  minimumRadius = 200
): Map<string, NodePosition> => {
  const positions = new Map<string, NodePosition>();
  const entities = nodes.filter((node): node is EntityGraphNode => node.nodeType === 'entity');
  const root = entities.find((node) => node.parentId === undefined);
  if (!root) return positions;

  const availableWidth = Math.max(MIN_CANVAS_WIDTH, canvas.width - reservedRight);
  const center = { x: availableWidth / 2, y: canvas.height / 2 };
  positions.set(root.id, center);
  const rootRadius = Math.max(
    minimumRadius,
    Math.min(330, availableWidth * 0.31, canvas.height * 0.34)
  );

  const unresolved = entities.filter((node) => node.id !== root.id);
  for (let pass = 0; pass < entities.length && unresolved.length > 0; pass++) {
    const byParent = new Map<string, EntityGraphNode[]>();
    for (const node of unresolved) {
      if (node.parentId && positions.has(node.parentId)) {
        byParent.set(node.parentId, [...(byParent.get(node.parentId) ?? []), node]);
      }
    }
    if (byParent.size === 0) break;

    for (const [parentId, children] of byParent) {
      const parent = positions.get(parentId);
      if (parent) {
        const sorted = [...children].sort((left, right) => left.id.localeCompare(right.id));
        if (parentId === root.id) {
          // Root ring: enforce minimum separation, spilling overflow to outer
          // rings so a busy root does not stack nodes/badges at similar angles.
          const slots = distributeRadial(sorted.length, rootRadius);
          sorted.forEach((node, index) => {
            const slot = slots[index];
            positions.set(node.id, {
              x: center.x + Math.cos(slot.angle) * slot.radius,
              y: center.y + Math.sin(slot.angle) * slot.radius,
            });
          });
        } else {
          const outwardAngle = Math.atan2(parent.y - center.y, parent.x - center.x);
          // Push crowded branches further out so a wide fan keeps at least one
          // footprint of separation between siblings (prevents node/badge stacking).
          const radius = 180 + Math.min(90, sorted.length * 12);
          // Fan wide enough that neighbors keep at least one footprint of
          // angular separation at this radius; never wrap past a hemisphere.
          const minStep = minAngularStep(radius);
          const desiredFan = Math.max(Math.PI * 0.3, (sorted.length - 1) * minStep);
          const fan = Math.min(Math.PI * 1.1, desiredFan);
          sorted.forEach((node, index) => {
            const offset = sorted.length === 1 ? 0 : (index / (sorted.length - 1) - 0.5) * fan;
            positions.set(node.id, {
              x: parent.x + Math.cos(outwardAngle + offset) * radius,
              y: parent.y + Math.sin(outwardAngle + offset) * radius,
            });
          });
        }
        for (const child of children) {
          const index = unresolved.findIndex(({ id }) => id === child.id);
          if (index >= 0) unresolved.splice(index, 1);
        }
      }
    }
  }
  return positions;
};

const getClusterPosition = (
  parent: NodePosition,
  center: NodePosition,
  parentId: string,
  rootId: string
): NodePosition => {
  const angle =
    parentId === rootId ? Math.PI / 2 : Math.atan2(parent.y - center.y, parent.x - center.x);
  return {
    x: parent.x + Math.cos(angle) * 92,
    y: parent.y + Math.sin(angle) * 92,
  };
};

const activityIcon = (kind: string): string => {
  switch (kind) {
    case 'network':
      return 'globe';
    case 'authentication':
      return 'user';
    case 'process':
      return 'commandLine';
    default:
      return 'document';
  }
};

/**
 * Renders the concrete event-activity breakdown for a relationship / node
 * (network, auth, process, file) with counts and timestamps so an analyst can
 * follow the graph to root cause. Renders nothing when there is no context.
 */
const RelationshipContextBreakdown: React.FC<{ context: EdgeContext }> = ({ context }) => {
  const { euiTheme } = useEuiTheme();
  if (context.activities.length === 0) return null;
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <strong>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.contextHeading',
            {
              defaultMessage: 'What happened ({count, plural, one {# event} other {# events}})',
              values: { count: context.totalEvents },
            }
          )}
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        {context.activities.map((activity) => (
          <div
            key={activity.kind}
            css={css`
              display: grid;
              grid-template-columns: auto minmax(0, 1fr);
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.xs} ${euiTheme.size.s};
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
              background: ${euiTheme.colors.backgroundBaseSubdued};
            `}
            data-test-subj={`entityIntelligenceContextActivity-${activity.kind}`}
          >
            <EuiIcon
              type={activityIcon(activity.kind)}
              size="s"
              color="subdued"
              aria-hidden={true}
            />
            <div>
              <EuiText size="xs">
                <strong>{activityKindLabel(activity.kind)}</strong> {'·'} {activityPhrase(activity)}
              </EuiText>
              {activity.lastSeen ? (
                <EuiText size="xs" color="subdued">
                  <PreferenceFormattedDate value={new Date(activity.lastSeen)} />
                </EuiText>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  entity,
  security,
  onInspectEntity,
  onEvidenceOpen,
  onHuntEntity,
  onTimeRangeChange,
  highlightedNodeKey,
  onNodeHighlight,
  focusNodeRequest,
  agentActivityRequest,
  onExplain,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvas = useCanvasSize(containerRef);
  const rootNode = useMemo(() => createRootNode(entity), [entity]);
  const [graph, setGraph] = useState<GraphState>(() => createGraphState(rootNode));
  const [expansionTarget, setExpansionTarget] = useState<EntityGraphNode | undefined>(rootNode);
  // The entity whose relationships the hook is actively querying. Unlike
  // `expansionTarget` (which clears as soon as the alert-derived neighbors are
  // placed), this stays set until the *next* expansion so the slower `logs-*`
  // event-context query stays enabled long enough to resolve and enrich edges.
  const [queryEntity, setQueryEntity] = useState<EntityGraphNode | undefined>(rootNode);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [focusedNodeId, setFocusedNodeId] = useState(rootNode.id);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipGraphEdge>();
  const [selectedAlertId, setSelectedAlertId] = useState<string>();
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('30d');
  const [entityKinds, setEntityKinds] = useState<readonly GraphEntityKind[]>(ALL_ENTITY_KINDS);
  const [severities, setSeverities] = useState<readonly AlertSeverity[]>(ALL_SEVERITIES);
  const [showEvidence, setShowEvidence] = useState(true);
  const securityContext = JSON.stringify([security?.spaceId, entity.id]);
  const [showAgentActivity, setShowAgentActivity] = useState(true);
  const agentPageContext = JSON.stringify([securityContext, timeRange, severities]);
  const [agentPage, setAgentPage] = useState({ context: agentPageContext, offset: 0 });
  const agentSessionOffset = agentPage.context === agentPageContext ? agentPage.offset : 0;
  const [securitySelection, setSecuritySelection] = useState<{
    context: string;
    sequence: string;
  }>();
  const [selectedSecurityEvent, setSelectedSecurityEvent] = useState<{
    context: string;
    id: string;
  }>();
  const securityLoading = !!security && (security.result.isLoading || security.result.isRefreshing);
  const securityReadable =
    !!security &&
    !securityLoading &&
    !security.result.unavailable &&
    security.scope.type === 'entity' &&
    security.scope.entity.id === entity.id;
  const loadedSecurityFindings = useMemo(
    () => (securityReadable ? security.result.findings : []),
    [securityReadable, security?.result.findings]
  );
  const securityFindings = useMemo(
    () => filterSecurityFindingsForGraph(loadedSecurityFindings, timeRange, severities),
    [loadedSecurityFindings, timeRange, severities]
  );
  const sessionTitles = useEntityAgentSessionTitles(security?.spaceId, securityFindings);
  const agentGraph = useMemo(
    () =>
      buildRelationshipAgentGraph(
        entity,
        securityFindings,
        sessionTitles,
        { sessionOffset: agentSessionOffset },
        { history: security?.riskHistory, resolution: security?.riskInputResolution }
      ),
    [
      entity,
      securityFindings,
      sessionTitles,
      agentSessionOffset,
      security?.riskHistory,
      security?.riskInputResolution,
    ]
  );
  useEffect(() => {
    if (
      securityReadable &&
      agentSessionOffset >= agentGraph.totalSessions &&
      agentSessionOffset > 0
    ) {
      setAgentPage({
        context: agentPageContext,
        offset: Math.max(0, Math.ceil(agentGraph.totalSessions / 3) - 1) * 3,
      });
    }
  }, [securityReadable, agentGraph.totalSessions, agentSessionOffset, agentPageContext]);
  const agentGraphVisible = showAgentActivity && agentGraph.sessions.length > 0;
  // Agent policy records belong to the exact tool branch, never a second generic event lane.
  const securitySequences = entitySecuritySequences(
    securityFindings.filter((finding) => !finding.agent),
    entity.id
  );
  const matchingSecurityCount = securityFindings.length;
  const securityFilteredOut = matchingSecurityCount === 0 && loadedSecurityFindings.length > 0;
  const securitySequence =
    (securitySelection?.context === securityContext
      ? securitySequences.find((sequence) => sequence.id === securitySelection.sequence)
      : undefined) ?? securitySequences[0];
  const securityDetails =
    selectedSecurityEvent?.context === securityContext
      ? securityFindings.find(
          (finding) =>
            JSON.stringify([finding.source.index, finding.source.id]) === selectedSecurityEvent.id
        )
      : undefined;
  useEffect(() => {
    setSelectedSecurityEvent(undefined);
  }, [securityContext, securityLoading, security?.result.unavailable]);
  useEffect(() => {
    if (selectedSecurityEvent && !securityDetails) setSelectedSecurityEvent(undefined);
  }, [securityDetails, selectedSecurityEvent]);
  const securityLaneVisible = showEvidence && !!securitySequence;
  const fittedSecuritySequence = useRef<string>();
  const fittedAgentGraph = useRef<string>();
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [failedExpansionNodeId, setFailedExpansionNodeId] = useState<string>();
  const [copiedNodeId, setCopiedNodeId] = useState<string>();
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragGesture = useRef<DragGesture>();
  const pendingVisibilityCheck = useRef<readonly string[]>();
  const lastExpandedParentId = useRef<string>();
  const appliedContextSignature = useRef<string>();
  const previousDrawerState = useRef(false);
  const viewportRef = useRef({ zoom, pan, canvas });
  viewportRef.current = { zoom, pan, canvas };

  const relationshipParams = useMemo(
    () => ({
      timeRange,
      entityTypes: entityKinds,
      severities,
      sizeLimit: 8,
    }),
    [entityKinds, severities, timeRange]
  );
  const {
    relationships,
    isLoading,
    isError,
    refetch: refetchRelationships,
  } = useEntityRelationships(
    queryEntity ? toRelationshipEntity(queryEntity) : undefined,
    relationshipParams
  );

  useEffect(() => {
    setGraph(createGraphState(rootNode));
    setExpansionTarget(rootNode);
    setQueryEntity(rootNode);
    lastExpandedParentId.current = undefined;
    appliedContextSignature.current = undefined;
    setSelectedNodeId(undefined);
    setFocusedNodeId(rootNode.id);
    setSelectedEdge(undefined);
    setSelectedAlertId(undefined);
    setContextDrawerOpen(false);
    setFailedExpansionNodeId(undefined);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [rootNode, timeRange, entityKinds, severities]);

  useEffect(() => {
    onTimeRangeChange?.(timeRange);
  }, [onTimeRangeChange, timeRange]);

  useEffect(() => {
    if (!expansionTarget || !relationships) return;
    const parentId = expansionTarget.id;
    lastExpandedParentId.current = parentId;
    const relatedNodes = relationships.related.map<EntityGraphNode>((related) => ({
      nodeType: 'entity',
      id: related.id,
      name: related.name,
      identifierValue: related.name,
      kind: related.kind,
      parentId,
      alertCount: related.alertCount,
      worstSeverity: related.worstSeverity,
      riskScore: undefined,
      context: related.context,
    }));
    const { neighborhood, group } = splitNeighborhood(parentId, relatedNodes, BRANCH_VISIBLE_LIMIT);
    pendingVisibilityCheck.current = neighborhood.nodes.map(({ id }) => id);
    setGraph((current) => {
      const merged = mergeNeighborhood(current, neighborhood);
      return group ? attachGroupNode(merged, group) : merged;
    });
    setFailedExpansionNodeId(undefined);
    setExpansionTarget(undefined);
  }, [expansionTarget, relationships]);

  // The `logs-*` event context resolves after the alert-derived relationships,
  // so the first merge above carries empty context. When the enriched
  // relationships arrive for the branch we just expanded, re-merge them onto
  // the existing nodes/edges so their relationship phrases light up. Re-merging
  // is idempotent (node alert counts use Math.max; edges are replaced by id).
  // A content signature guards against re-applying the same enrichment (which
  // would loop, since the query hook returns a fresh object each render).
  useEffect(() => {
    const parentId = lastExpandedParentId.current;
    if (expansionTarget || !relationships || !parentId) return;
    const enriched = relationships.related.filter((related) => related.context.totalEvents > 0);
    if (enriched.length === 0) return;
    const signature = `${parentId}|${enriched
      .map((related) => `${related.id}:${related.context.totalEvents}`)
      .join(',')}`;
    if (appliedContextSignature.current === signature) return;
    appliedContextSignature.current = signature;
    const enrichedNodes = enriched.map<EntityGraphNode>((related) => ({
      nodeType: 'entity',
      id: related.id,
      name: related.name,
      identifierValue: related.name,
      kind: related.kind,
      parentId,
      alertCount: related.alertCount,
      worstSeverity: related.worstSeverity,
      riskScore: undefined,
      context: related.context,
    }));
    // Only re-merge entities that are already on the canvas so we do not
    // resurrect nodes the analyst has collapsed or folded into a group.
    setGraph((current) => {
      const visibleIds = new Set(current.nodes.map((node) => node.id));
      const present = enrichedNodes.filter((node) => visibleIds.has(node.id));
      if (present.length === 0) return current;
      const { neighborhood } = splitNeighborhood(parentId, present, present.length);
      return mergeNeighborhood(current, neighborhood);
    });
  }, [expansionTarget, relationships]);

  useEffect(() => {
    if (isError && expansionTarget) {
      setFailedExpansionNodeId(expansionTarget.id);
    }
  }, [expansionTarget, isError]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowOnboarding(false), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setShowOnboarding(false);
      const { zoom: currentZoom, pan: currentPan, canvas: currentCanvas } = viewportRef.current;
      const bounds = svg.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      const pointer = {
        x: ((event.clientX - bounds.left) / bounds.width) * currentCanvas.width,
        y: ((event.clientY - bounds.top) / bounds.height) * currentCanvas.height,
      };
      const world = {
        x: (pointer.x - currentPan.x) / currentZoom,
        y: (pointer.y - currentPan.y) / currentZoom,
      };
      const normalizedDelta = Math.max(-80, Math.min(80, event.deltaY));
      const nextZoom = Math.min(
        2.2,
        Math.max(0.35, currentZoom * Math.exp(-normalizedDelta * 0.003))
      );
      setZoom(nextZoom);
      setPan({
        x: pointer.x - world.x * nextZoom,
        y: pointer.y - world.y * nextZoom,
      });
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedNodeId(undefined);
        setSelectedEdge(undefined);
        setSelectedAlertId(undefined);
        setContextDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedNode = graph.nodes.find(
    (node): node is EntityGraphNode => node.nodeType === 'entity' && node.id === selectedNodeId
  );
  const evidenceEntities = useMemo<readonly RelationshipEntity[]>(() => {
    if (selectedEdge) {
      return [selectedEdge.source, selectedEdge.target]
        .map((id) => graph.nodes.find((node) => node.id === id))
        .filter((node): node is EntityGraphNode => node?.nodeType === 'entity')
        .map(toRelationshipEntity);
    }
    return selectedNode ? [toRelationshipEntity(selectedNode)] : [];
  }, [graph.nodes, selectedEdge, selectedNode]);

  const {
    alerts,
    totalAlerts,
    isLoading: isEvidenceLoading,
    isError: isEvidenceError,
    refetch: refetchEvidence,
  } = useAlertEvidence({
    entities: evidenceEntities,
    timeRange,
    severities,
    sizeLimit: 20,
    enabled: showEvidence && evidenceEntities.length > 0,
  });

  const evidenceParentId = selectedEdge?.source ?? selectedNode?.id;
  useEffect(() => {
    if (!showEvidence || !evidenceParentId || alerts.length === 0) return;
    setGraph((current) => mergeAlertEvidence(current, evidenceParentId, alerts));
  }, [alerts, evidenceParentId, showEvidence]);

  const visibleEntityNodes = useMemo(
    () =>
      graph.nodes.filter(
        (node): node is EntityGraphNode =>
          node.nodeType === 'entity' && (node.id === rootNode.id || entityKinds.includes(node.kind))
      ),
    [entityKinds, graph.nodes, rootNode.id]
  );
  const visibleEdges = useMemo(() => {
    const visibleEntityIds = new Set(visibleEntityNodes.map(({ id }) => id));
    return graph.edges.filter(
      (edge): edge is RelationshipGraphEdge =>
        edge.edgeType === 'relationship' &&
        visibleEntityIds.has(edge.source) &&
        visibleEntityIds.has(edge.target)
    );
  }, [graph.edges, visibleEntityNodes]);

  // AI "Explain this cluster": assembles a grounded prompt from the visible
  // neighbors (types, shared-alert counts, worst severity, real event-activity
  // phrases) plus the detection rules seen on the cluster, then hands it to the
  // shared explain flyout owned by the Explorer tab.
  const explainNeighbors = useMemo<GraphExplainNeighbor[]>(
    () =>
      visibleEntityNodes
        .filter((node) => node.id !== rootNode.id)
        .slice(0, 12)
        .map((node) => ({
          name: node.name,
          kind: node.kind,
          alertCount: node.alertCount,
          worstSeverity: node.worstSeverity,
          activity: node.context.dominant ? activityPhrase(node.context.dominant) : undefined,
        })),
    [rootNode.id, visibleEntityNodes]
  );

  // Distinct detection rules currently visible as alert nodes (grounding). Alert
  // nodes are merged when evidence is shown; deduped by rule name + severity.
  const explainAlertRules = useMemo<GraphExplainAlertRule[]>(() => {
    const byRule = new Map<string, GraphExplainAlertRule>();
    for (const node of graph.nodes) {
      if (node.nodeType === 'alert') {
        const { ruleName, severity } = node.alert;
        if (ruleName && !byRule.has(ruleName)) {
          byRule.set(ruleName, { ruleName, severity, tactic: undefined });
        }
      }
    }
    return [...byRule.values()].slice(0, 12);
  }, [graph.nodes]);

  const runGraphExplain = useCallback(() => {
    onExplain?.(
      [
        buildGraphExplainPrompt({
          focusName: entity.name,
          focusKind: entity.type,
          timeRange,
          neighbors: explainNeighbors,
          alertRules: explainAlertRules,
        }),
        agentGraphVisible ? relationshipAgentGraphExplainEvidence(agentGraph) : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.graphExplainSubtitle',
        {
          defaultMessage: 'Relationship cluster · {name}',
          values: { name: entity.name },
        }
      )
    );
  }, [
    entity.name,
    entity.type,
    explainAlertRules,
    explainNeighbors,
    onExplain,
    timeRange,
    agentGraphVisible,
    agentGraph,
  ]);

  const alertClusters = useMemo<readonly AlertCluster[]>(() => {
    if (!showEvidence) return [];
    const byParent = new Map<string, AlertGraphNode[]>();
    for (const node of graph.nodes) {
      if (
        node.nodeType === 'alert' &&
        (node.alert.severity === undefined || severities.includes(node.alert.severity))
      ) {
        byParent.set(node.parentId, [...(byParent.get(node.parentId) ?? []), node]);
      }
    }
    return [...byParent].map(([parentId, clusterAlerts]) => ({
      parentId,
      alerts: clusterAlerts,
    }));
  }, [graph.nodes, severities, showEvidence]);
  const visibleGroupNodes = useMemo(() => {
    const parentIds = new Set(visibleEntityNodes.map(({ id }) => id));
    return graph.nodes.filter(
      (node): node is GroupGraphNode => node.nodeType === 'group' && parentIds.has(node.parentId)
    );
  }, [graph.nodes, visibleEntityNodes]);
  const maxEdgeAlertCount = useMemo(
    () => visibleEdges.reduce((max, edge) => Math.max(max, edge.alertCount), 1),
    [visibleEdges]
  );
  const navigationOrder = useMemo(
    () => orderedEntityIdsForNavigation(visibleEntityNodes),
    [visibleEntityNodes]
  );
  // Explorer already sizes this canvas around external panels. Only this graph's
  // own overlay needs space reserved inside its measured width.
  const hasGraphDrawer = contextDrawerOpen;

  const securityColumns =
    Math.max(MIN_CANVAS_WIDTH, canvas.width - (hasGraphDrawer ? CONTEXT_DRAWER_WIDTH : 0)) < 850
      ? 2
      : 4;
  const securityLaneHeight = securityLaneVisible
    ? Math.ceil(Math.min(securitySequence?.findings.length ?? 0, 4) / securityColumns) *
      (SECURITY_EVENT_HEIGHT + 18)
    : 0;

  const positions = useMemo(() => {
    const graphCanvas = agentGraphVisible
      ? {
          width: visibleEntityNodes.length > 1 ? 680 : 320,
          height: Math.max(500, canvas.height - securityLaneHeight),
        }
      : securityLaneVisible
      ? { ...canvas, height: Math.max(280, canvas.height - securityLaneHeight - 100) }
      : canvas;
    const layout = layoutGraphNodes(
      visibleEntityNodes,
      graphCanvas,
      !agentGraphVisible && hasGraphDrawer ? CONTEXT_DRAWER_WIDTH : 0,
      securityLaneVisible ? 140 : 200
    );
    return securityLaneVisible
      ? new Map([...layout].map(([id, position]) => [id, { ...position, y: position.y + 40 }]))
      : layout;
  }, [
    canvas,
    hasGraphDrawer,
    securityLaneHeight,
    securityLaneVisible,
    visibleEntityNodes,
    agentGraphVisible,
  ]);
  const securityRootPosition = positions.get(rootNode.id);
  const agentLayout = useMemo(
    () =>
      agentGraphVisible && securityRootPosition
        ? layoutRelationshipAgents(agentGraph, {
            root: securityRootPosition,
            left:
              Math.max(...[...positions.values()].map(({ x }) => x)) +
              RELATIONSHIP_AGENT_HANDOFF_GAP,
          })
        : undefined,
    [agentGraphVisible, securityRootPosition, agentGraph, positions]
  );
  const securityNodes = useMemo(
    () =>
      securityLaneVisible && securityRootPosition && securitySequence
        ? layoutSecurityEvents(
            securitySequence.findings,
            securityRootPosition.x,
            Math.max(
              agentLayout ? agentLayout.bounds.bottom + 96 : 0,
              ...[...positions.values()].map((position) => position.y + 96)
            ),
            securityColumns
          )
        : [],
    [
      positions,
      securityColumns,
      securityLaneVisible,
      securityRootPosition,
      securitySequence,
      agentLayout,
    ]
  );

  const availableCenter = useMemo(
    () => ({
      x: Math.max(MIN_CANVAS_WIDTH, canvas.width - (hasGraphDrawer ? CONTEXT_DRAWER_WIDTH : 0)) / 2,
      y: canvas.height / 2,
    }),
    [canvas, hasGraphDrawer]
  );

  const fitGraph = useCallback(() => {
    const allPositions = [
      ...visibleEntityNodes
        .map(({ id }) => positions.get(id))
        .filter((position): position is NodePosition => position !== undefined),
      ...(agentLayout
        ? [
            { x: agentLayout.bounds.left, y: agentLayout.bounds.top },
            { x: agentLayout.bounds.right, y: agentLayout.bounds.bottom },
          ]
        : []),
      ...securityNodes.flatMap(({ x, y }) => [
        { x, y },
        { x: x + SECURITY_EVENT_WIDTH, y: y + SECURITY_EVENT_HEIGHT },
      ]),
    ];
    if (allPositions.length === 0) return;
    const minX = Math.min(...allPositions.map(({ x }) => x)) - 80;
    const maxX = Math.max(...allPositions.map(({ x }) => x)) + 80;
    const minY = Math.min(...allPositions.map(({ y }) => y)) - 80;
    const maxY = Math.max(...allPositions.map(({ y }) => y)) + 80;
    const availableWidth = Math.max(
      MIN_CANVAS_WIDTH,
      canvas.width - (hasGraphDrawer ? CONTEXT_DRAWER_WIDTH : 0)
    );
    const nextZoom = Math.min(
      1.45,
      Math.max(
        0.35,
        Math.min((availableWidth - 96) / (maxX - minX), (canvas.height - 150) / (maxY - minY))
      )
    );
    setZoom(nextZoom);
    setPan({
      x: availableWidth / 2 - ((minX + maxX) / 2) * nextZoom,
      y: canvas.height / 2 - ((minY + maxY) / 2) * nextZoom,
    });
  }, [canvas, hasGraphDrawer, positions, securityNodes, visibleEntityNodes, agentLayout]);

  useEffect(() => {
    const key = JSON.stringify([securityContext, securitySequence?.id]);
    if (securityNodes.length && fittedSecuritySequence.current !== key) {
      fittedSecuritySequence.current = key;
      fitGraph();
    }
  }, [fitGraph, securityContext, securityNodes.length, securitySequence?.id]);

  useEffect(() => {
    const key = agentLayout
      ? JSON.stringify([
          securityContext,
          agentPageContext,
          agentSessionOffset,
          canvas,
          hasGraphDrawer,
          agentLayout.bounds,
          agentGraph.sessions.map(({ key: sessionKey }) => sessionKey),
        ])
      : undefined;
    if (key && fittedAgentGraph.current !== key) {
      fittedAgentGraph.current = key;
      fitGraph();
    } else if (!key && fittedAgentGraph.current) {
      fittedAgentGraph.current = undefined;
      fitGraph();
    }
  }, [
    agentLayout,
    agentGraph.sessions,
    agentPageContext,
    agentSessionOffset,
    canvas,
    fitGraph,
    hasGraphDrawer,
    securityContext,
  ]);

  const lastAgentActivityNonce = useRef<number>();
  useEffect(() => {
    if (
      !agentActivityRequest ||
      agentActivityRequest.entityId !== entity.id ||
      agentActivityRequest.nonce === lastAgentActivityNonce.current
    )
      return;
    lastAgentActivityNonce.current = agentActivityRequest.nonce;
    setShowAgentActivity(true);
    setContextDrawerOpen(false);
    fittedAgentGraph.current = undefined;
    fitGraph();
  }, [agentActivityRequest, entity.id, fitGraph]);

  const focusNode = useCallback(
    (id: string) => {
      const position = positions.get(id);
      if (!position) return;
      setFocusedNodeId(id);
      setPan({
        x: availableCenter.x - position.x * zoom,
        y: availableCenter.y - position.y * zoom,
      });
    },
    [availableCenter, positions, zoom]
  );

  const navigationRef = useRef({ order: navigationOrder, focusedNodeId, focusNode });
  navigationRef.current = { order: navigationOrder, focusedNodeId, focusNode };

  // External focus request (e.g. clicking a timeline step's "focus in graph").
  // Selects + centers the matching node when present. A nonce lets the same
  // key re-fire; guarded so we only act on a new request.
  const lastFocusNonce = useRef<number | undefined>();
  useEffect(() => {
    if (!focusNodeRequest || focusNodeRequest.nonce === lastFocusNonce.current) return;
    lastFocusNonce.current = focusNodeRequest.nonce;
    const target = visibleEntityNodes.find((node) => node.id === focusNodeRequest.key);
    if (target) {
      setSelectedNodeId(target.id);
      focusNode(target.id);
    }
  }, [focusNodeRequest, focusNode, visibleEntityNodes]);
  useEffect(() => {
    const handleArrowNav = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'combobox')
      ) {
        return;
      }
      const { order, focusedNodeId: current, focusNode: focus } = navigationRef.current;
      if (order.length === 0) return;
      event.preventDefault();
      const index = order.indexOf(current);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = index < 0 ? 0 : (index + delta + order.length) % order.length;
      focus(order[nextIndex]);
    };
    window.addEventListener('keydown', handleArrowNav);
    return () => window.removeEventListener('keydown', handleArrowNav);
  }, []);

  useEffect(() => {
    if (previousDrawerState.current !== hasGraphDrawer) {
      previousDrawerState.current = hasGraphDrawer;
      fitGraph();
    }
  }, [fitGraph, hasGraphDrawer]);

  useEffect(() => {
    const nodeIds = pendingVisibilityCheck.current;
    if (!nodeIds || nodeIds.length === 0) return;
    pendingVisibilityCheck.current = undefined;
    const availableRight = canvas.width - (hasGraphDrawer ? CONTEXT_DRAWER_WIDTH : 0) - 48;
    const isOutsideViewport = nodeIds.some((id) => {
      const position = positions.get(id);
      if (!position) return false;
      const screenX = pan.x + position.x * zoom;
      const screenY = pan.y + position.y * zoom;
      return (
        screenX < 48 || screenX > availableRight || screenY < 100 || screenY > canvas.height - 60
      );
    });
    if (isOutsideViewport) fitGraph();
  }, [canvas, fitGraph, hasGraphDrawer, pan, positions, zoom]);

  const markInteracted = () => setShowOnboarding(false);
  const expandNode = (node: EntityGraphNode) => {
    markInteracted();
    if (
      node.identifierValue !== '' &&
      !graph.expandedNodeIds.has(node.id) &&
      (!expansionTarget || isError)
    ) {
      setFailedExpansionNodeId(undefined);
      setExpansionTarget(node);
      setQueryEntity(node);
      focusNode(node.id);
    }
  };
  const retryExpansion = () => {
    const failedNode = graph.nodes.find(
      (node): node is EntityGraphNode =>
        node.nodeType === 'entity' && node.id === failedExpansionNodeId
    );
    if (failedNode) {
      setFailedExpansionNodeId(undefined);
      if (expansionTarget?.id === failedNode.id) {
        refetchRelationships();
      } else {
        setExpansionTarget(failedNode);
        setQueryEntity(failedNode);
      }
    }
  };
  const openEvidenceDrawer = (parentNode: EntityGraphNode) => {
    markInteracted();
    setSelectedNodeId(parentNode.id);
    setSelectedEdge(undefined);
    setSelectedAlertId(undefined);
    setContextDrawerOpen(true);
    setShowEvidence(true);
    onEvidenceOpen();
  };
  const closeContextDrawer = () => {
    setContextDrawerOpen(false);
    setSelectedEdge(undefined);
    setSelectedAlertId(undefined);
  };
  const revealGroup = (groupId: string) => {
    markInteracted();
    setGraph((current) => {
      const promotion = expandGroup(current, groupId, BRANCH_VISIBLE_LIMIT);
      if (!promotion) return current;
      pendingVisibilityCheck.current = promotion.neighborhood.nodes.map(({ id }) => id);
      return mergeNeighborhood(promotion.state, promotion.neighborhood);
    });
  };
  const huntNode = (node: EntityGraphNode) => {
    markInteracted();
    if (node.kind !== 'ip') onHuntEntity?.(toRelatedEntity(node));
  };
  const copyNodeValue = (node: EntityGraphNode) => {
    const value = node.identifierValue || node.name;
    const write = navigator?.clipboard?.writeText?.(value);
    setCopiedNodeId(node.id);
    window.setTimeout(() => setCopiedNodeId(undefined), 1500);
    return write;
  };

  const toggleKind = (kind: GraphEntityKind) =>
    setEntityKinds((current) =>
      current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind]
    );
  const toggleSeverity = (severity: AlertSeverity) =>
    setSeverities((current) =>
      current.includes(severity)
        ? current.filter((value) => value !== severity)
        : [...current, severity]
    );
  const activeFilterCount =
    ALL_ENTITY_KINDS.length - entityKinds.length + ALL_SEVERITIES.length - severities.length;
  const searchMatch = search.trim().toLowerCase();
  const searchResult = searchMatch
    ? visibleEntityNodes.find((node) => node.name.toLowerCase().includes(searchMatch))
    : undefined;

  /**
   * Node ids whose labels must be hidden to avoid label-on-label collisions.
   * Selected / focused / matched / root labels win; the rest are hidden when
   * their pill would overlap a higher-priority label. Revealed again on
   * hover/focus (those nodes are always high priority). Recomputed only when
   * geometry or the active selection changes.
   */
  const hiddenLabels = useMemo(() => {
    const boxes: LabelBox[] = [];
    for (const node of visibleEntityNodes) {
      const position = positions.get(node.id);
      if (position) {
        const isRoot = node.id === rootNode.id;
        const radius = isRoot ? ROOT_RADIUS : ENTITY_RADIUS;
        const highPriority =
          isRoot ||
          node.id === selectedNodeId ||
          node.id === focusedNodeId ||
          (searchMatch !== '' && node.name.toLowerCase().includes(searchMatch));
        boxes.push({
          id: node.id,
          x: position.x,
          y: position.y + radius + 23,
          width: Math.min(
            isRoot && agentGraphVisible ? 260 : 164,
            Math.max(84, node.name.length * 7.6)
          ),
          height: 25,
          priority: highPriority ? 0 : 1 + node.id.length / 1000,
        });
      }
    }
    // Include the "+N" group nodes and on-edge count chips so they participate
    // in the same greedy collision sweep — a dense center no longer stacks a
    // group bubble or a "shared alerts" chip on top of a node label. Group /
    // chip boxes get a slightly lower keep-priority than real node labels so a
    // node label wins a tie, but both hide when they would overlap something
    // already kept. Selected/focused geometry stays high priority (revealed).
    for (const group of visibleGroupNodes) {
      const parent = positions.get(group.parentId);
      if (parent) {
        const outwardAngle =
          group.parentId === rootNode.id
            ? -Math.PI / 2
            : Math.atan2(parent.y - availableCenter.y, parent.x - availableCenter.x);
        boxes.push({
          id: group.id,
          x: parent.x + Math.cos(outwardAngle) * 96,
          y: parent.y + Math.sin(outwardAngle) * 96,
          width: 44,
          height: 44,
          priority: 2,
        });
      }
    }
    for (const edge of visibleEdges) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (source && target) {
        const highPriority = edge.id === selectedEdge?.id;
        boxes.push({
          id: `chip:${edge.id}`,
          x: (source.x + target.x) / 2,
          y: (source.y + target.y) / 2,
          width: 96,
          height: 24,
          priority: highPriority ? 0 : 3,
        });
      }
    }
    return hiddenLabelIds(boxes);
  }, [
    agentGraphVisible,
    availableCenter,
    focusedNodeId,
    positions,
    rootNode.id,
    searchMatch,
    selectedEdge?.id,
    selectedNodeId,
    visibleEdges,
    visibleEntityNodes,
    visibleGroupNodes,
  ]);
  const selectedAlert =
    graph.nodes.find(
      (node): node is AlertGraphNode => node.nodeType === 'alert' && node.id === selectedAlertId
    )?.alert ?? alerts.find((alert) => `alert:${alert.id}` === selectedAlertId);

  /**
   * Screen-space placement for the floating action toolbar of the selected
   * node. Collision-safe: {@link chooseToolbarPlacement} flips it to whichever
   * side (below/above/right/left) least occludes nearby node footprints + edge
   * chips and clamps it fully inside the canvas, so the strip never buries a
   * neighbor label or clips a viewport edge. Recomputed as the selection,
   * layout, or viewport transform changes.
   */
  const toolbarPlacement = useMemo(() => {
    if (!selectedNodeId) return undefined;
    const nodePosition = positions.get(selectedNodeId);
    if (!nodePosition) return undefined;
    const toScreen = (point: NodePosition): NodePosition => ({
      x: pan.x + point.x * zoom,
      y: pan.y + point.y * zoom,
    });
    const nodeScreen = toScreen(nodePosition);
    const nodeRadius = (selectedNodeId === rootNode.id ? ROOT_RADIUS : ENTITY_RADIUS) * zoom + 12;
    const obstacles: Rect[] = [];
    for (const node of visibleEntityNodes) {
      const other = node.id === selectedNodeId ? undefined : positions.get(node.id);
      if (other) {
        const screen = toScreen(other);
        const footprint = (node.id === rootNode.id ? ROOT_RADIUS : ENTITY_RADIUS) * 2 * zoom + 46;
        obstacles.push({ x: screen.x, y: screen.y, width: footprint, height: footprint });
      }
    }
    // Toolbar width scales with the (up to ~7) visible action buttons.
    const buttonCount = 5 + (onHuntEntity ? 1 : 0) + 1;
    const toolbarWidth = buttonCount * 30 + 8;
    return chooseToolbarPlacement(
      nodeScreen,
      nodeRadius,
      { width: toolbarWidth, height: 40 },
      { width: canvas.width, height: canvas.height },
      obstacles
    );
  }, [
    canvas.height,
    canvas.width,
    onHuntEntity,
    pan.x,
    pan.y,
    positions,
    rootNode.id,
    selectedNodeId,
    visibleEntityNodes,
    zoom,
  ]);

  const isRootExpanding = !!expansionTarget && expansionTarget.id === rootNode.id;
  const showNoRelationships =
    graph.expandedNodeIds.has(rootNode.id) &&
    !isRootExpanding &&
    !isError &&
    visibleEntityNodes.length === 1 &&
    alertClusters.length === 0 &&
    !agentGraphVisible &&
    !securityLaneVisible;

  const graphStyle = css`
    position: relative;
    width: 100%;
    height: 100%;
    min-height: ${MIN_CANVAS_HEIGHT}px;
    overflow: hidden;
    background: radial-gradient(
        circle at 50% 48%,
        ${transparentize(euiTheme.colors.primary, 0.045)},
        transparent 42%
      ),
      ${euiTheme.colors.backgroundBasePlain};
  `;
  const commandBarStyle = css`
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

    @media (max-width: 899px) {
      left: ${euiTheme.size.xl};
      right: ${euiTheme.size.s};
      transform: none;
      max-width: none;
    }
  `;
  // Thin vertical rule separating logical control groups in the command bar.
  const commandBarDividerStyle = css`
    width: ${euiTheme.border.width.thin};
    align-self: stretch;
    margin: ${euiTheme.size.xs} ${euiTheme.size.xxs};
    background: ${euiTheme.colors.borderBasePlain};
  `;
  const actionStripStyle = css`
    position: absolute;
    z-index: 13;
    display: flex;
    gap: 2px;
    padding: 3px;
    border: ${euiTheme.border.thin};
    border-radius: 999px;
    background: ${transparentize(euiTheme.colors.backgroundBasePlain, 0.96)};
    box-shadow: ${euiTheme.shadows.s};
    backdrop-filter: blur(16px);
  `;
  const drawerStyle = css`
    position: absolute;
    z-index: 8;
    inset: 0 0 0 auto;
    width: min(${CONTEXT_DRAWER_WIDTH}px, calc(100% - 80px));
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: ${euiTheme.size.l};
    border-left: ${euiTheme.border.thin};
    background: ${euiTheme.colors.backgroundBasePlain};
    box-shadow: ${euiTheme.shadows.xl};
    animation: drawer-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) both;

    @keyframes drawer-enter {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 899px) {
      top: 36%;
      width: 100%;
      border-top: ${euiTheme.border.thin};
      border-left: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;
  const labelStyle = css`
    font-size: 12px;
    font-weight: ${euiTheme.font.weight.medium};
    fill: ${euiTheme.colors.textParagraph};
    pointer-events: none;
  `;
  const legendRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin: ${euiTheme.size.xs} 0 0;
  `;
  const legendSectionLabelStyle = css`
    font-size: 10px;
    font-weight: ${euiTheme.font.weight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
    margin: ${euiTheme.size.m} 0 ${euiTheme.size.xs};
  `;
  const legendSwatchDot = (color: string) => css`
    flex-shrink: 0;
    width: ${euiTheme.size.m};
    height: ${euiTheme.size.m};
    border-radius: 50%;
    background: ${color};
  `;
  const legendLineSwatch = (thickness: number) => css`
    flex-shrink: 0;
    width: ${euiTheme.size.l};
    height: ${thickness}px;
    border-radius: ${thickness}px;
    background: ${euiTheme.colors.severity.risk};
  `;

  const filterButton = (
    <EuiButtonEmpty size="xs" iconType="filter" onClick={() => setFilterOpen((open) => !open)}>
      {COPY.filter}{' '}
      {activeFilterCount > 0 ? <EuiBadge color="hollow">{activeFilterCount}</EuiBadge> : null}
    </EuiButtonEmpty>
  );
  const overflowButton = (
    <EuiToolTip
      disableScreenReaderOutput
      content={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.graph.moreControls',
        { defaultMessage: 'More graph controls' }
      )}
    >
      <EuiButtonIcon
        iconType="ellipsis"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.graph.moreControls',
          { defaultMessage: 'More graph controls' }
        )}
        onClick={() => setOverflowOpen((open) => !open)}
      />
    </EuiToolTip>
  );

  return (
    <div ref={containerRef} css={graphStyle} data-test-subj="entityIntelligenceRelationshipGraph">
      <div css={commandBarStyle} role="toolbar">
        <EuiFieldSearch
          compressed
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.graph.findNode',
            { defaultMessage: 'Find node' }
          )}
          append={
            <EuiToolTip
              disableScreenReaderOutput
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.focusMatch',
                { defaultMessage: 'Focus matching node' }
              )}
            >
              <EuiButtonIcon
                iconType="crosshair"
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.graph.focusMatch',
                  { defaultMessage: 'Focus matching node' }
                )}
                disabled={!searchResult}
                onClick={() => searchResult && focusNode(searchResult.id)}
              />
            </EuiToolTip>
          }
          css={css`
            width: min(250px, 28vw);
          `}
        />
        <span css={commandBarDividerStyle} aria-hidden="true" />
        <EuiSelect
          compressed
          value={timeRange}
          onChange={(event) => setTimeRange(event.target.value as TimeRangePreset)}
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.graph.timeRange',
            { defaultMessage: 'Graph time range' }
          )}
          options={[
            { value: '24h', text: '24h' },
            { value: '7d', text: '7d' },
            { value: '30d', text: '30d' },
            { value: '90d', text: '90d' },
          ]}
        />
        <span css={commandBarDividerStyle} aria-hidden="true" />
        <EuiPopover
          aria-label={COPY.filter}
          button={filterButton}
          isOpen={filterOpen}
          closePopover={() => setFilterOpen(false)}
          anchorPosition="downCenter"
          panelPaddingSize="m"
        >
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.entityTypes',
                { defaultMessage: 'Entity types' }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" wrap>
            {ALL_ENTITY_KINDS.map((kind) => (
              <EuiFlexItem grow={false} key={kind}>
                <EuiCheckbox
                  id={`graph-kind-${kind}`}
                  label={kindLabel(kind)}
                  checked={entityKinds.includes(kind)}
                  onChange={() => toggleKind(kind)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.alertSeverity',
                { defaultMessage: 'Alert severity' }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" wrap>
            {ALL_SEVERITIES.map((severity) => (
              <EuiFlexItem grow={false} key={severity}>
                <EuiCheckbox
                  id={`graph-severity-${severity}`}
                  label={severity}
                  checked={severities.includes(severity)}
                  onChange={() => toggleSeverity(severity)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPopover>
        <span css={commandBarDividerStyle} aria-hidden="true" />
        <EuiToolTip
          content={showEvidence ? COPY.evidenceHide : COPY.evidenceShow}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType={showEvidence ? 'eye' : 'eyeSlash'}
            display={showEvidence ? 'base' : 'empty'}
            aria-label={showEvidence ? COPY.evidenceHide : COPY.evidenceShow}
            onClick={() => setShowEvidence((current) => !current)}
            data-test-subj="entityIntelligenceGraphEvidenceToggle"
          />
        </EuiToolTip>
        <EuiToolTip
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.graph.fitGraph',
            { defaultMessage: 'Fit graph' }
          )}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="fullScreen"
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.fitGraph',
              { defaultMessage: 'Fit graph' }
            )}
            onClick={fitGraph}
          />
        </EuiToolTip>
        <span css={commandBarDividerStyle} aria-hidden="true" />
        <EuiButton
          size="s"
          iconType="sparkles"
          onClick={runGraphExplain}
          data-test-subj="entityIntelligenceGraphExplainButton"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.graphExplainButton',
            { defaultMessage: 'Explain this' }
          )}
        </EuiButton>
        <span css={commandBarDividerStyle} aria-hidden="true" />
        <EuiPopover
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.graph.moreControls',
            { defaultMessage: 'More graph controls' }
          )}
          button={overflowButton}
          isOpen={overflowOpen}
          closePopover={() => setOverflowOpen(false)}
          anchorPosition="downRight"
          panelPaddingSize="s"
        >
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            <EuiToolTip
              disableScreenReaderOutput
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.zoomOut',
                { defaultMessage: 'Zoom out' }
              )}
            >
              <EuiButtonIcon
                iconType="minusCircle"
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.graph.zoomOut',
                  { defaultMessage: 'Zoom out' }
                )}
                onClick={() => setZoom((current) => Math.max(0.35, current - 0.15))}
              />
            </EuiToolTip>
            <EuiToolTip
              disableScreenReaderOutput
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.zoomIn',
                { defaultMessage: 'Zoom in' }
              )}
            >
              <EuiButtonIcon
                iconType="plusCircle"
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.graph.zoomIn',
                  { defaultMessage: 'Zoom in' }
                )}
                onClick={() => setZoom((current) => Math.min(2.2, current + 0.15))}
              />
            </EuiToolTip>
            <EuiToolTip
              disableScreenReaderOutput
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.resetGraph',
                { defaultMessage: 'Reset graph' }
              )}
            >
              <EuiButtonIcon
                iconType="refresh"
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.graph.resetGraph',
                  { defaultMessage: 'Reset graph' }
                )}
                onClick={() => {
                  setGraph(createGraphState(rootNode));
                  setExpansionTarget(rootNode);
                  setQueryEntity(rootNode);
                  lastExpandedParentId.current = undefined;
                  appliedContextSignature.current = undefined;
                  setSelectedNodeId(undefined);
                  setSelectedEdge(undefined);
                  setContextDrawerOpen(false);
                  setFailedExpansionNodeId(undefined);
                  setPan({ x: 0, y: 0 });
                  setZoom(1);
                }}
              />
            </EuiToolTip>
          </EuiFlexGroup>
        </EuiPopover>
      </div>

      <div
        css={css`
          position: absolute;
          z-index: 6;
          right: ${hasGraphDrawer ? `${CONTEXT_DRAWER_WIDTH + 16}px` : euiTheme.size.m};
          bottom: ${euiTheme.size.s};
          width: ${legendOpen ? '300px' : 'auto'};
          max-width: calc(100% - ${euiTheme.size.xl});
          padding: ${euiTheme.size.s};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${transparentize(euiTheme.colors.backgroundBasePlain, 0.92)};
          box-shadow: ${euiTheme.shadows.s};
          backdrop-filter: blur(12px);
        `}
        data-test-subj="entityIntelligenceGraphLegend"
      >
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          css={css`
            cursor: pointer;
          `}
          onClick={() => setLegendOpen((open) => !open)}
          role="button"
          tabIndex={0}
          aria-expanded={legendOpen}
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.graph.legend',
            { defaultMessage: 'Graph legend' }
          )}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setLegendOpen((open) => !open);
          }}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="list" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendTitle',
                  { defaultMessage: 'Legend & controls' }
                )}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={legendOpen ? 'chevronSingleDown' : 'chevronSingleUp'}
              size="s"
              color="subdued"
              aria-hidden={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiBadge color="hollow" iconType="keyboard">
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.zoomChip', {
            defaultMessage: '⌘/Ctrl + scroll to zoom',
          })}
        </EuiBadge>
        {legendOpen ? (
          <div
            css={css`
              max-height: min(52vh, 460px);
              overflow-y: auto;
              overscroll-behavior: contain;
              padding-right: ${euiTheme.size.xs};
            `}
          >
            {/* Node types */}
            <div css={legendSectionLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendNodeTypesLabel',
                { defaultMessage: 'Node types' }
              )}
            </div>
            <EuiText size="xs" color="subdued">
              {ALL_ENTITY_KINDS.map((kind) => (
                <p css={legendRowStyle} key={`legend-kind-${kind}`}>
                  <EuiIcon type={nodeIcon(kind)} size="m" color="subdued" aria-hidden={true} />
                  {kindLabel(kind)}
                </p>
              ))}
            </EuiText>

            {/* Risk / severity color */}
            <div css={legendSectionLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityLabel',
                { defaultMessage: 'Risk & severity color' }
              )}
            </div>
            <EuiText size="xs" color="subdued">
              {ALL_SEVERITIES.slice()
                .reverse()
                .map((severity) => (
                  <p css={legendRowStyle} key={`legend-sev-${severity}`}>
                    <span css={legendSwatchDot(getAlertSeverityColor(euiTheme, severity))} />
                    {severityLegendLabel(severity)}
                  </p>
                ))}
              <p css={legendRowStyle}>
                <span css={legendSwatchDot(euiTheme.colors.severity.unknown)} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityNone',
                  { defaultMessage: 'No alerts / unknown' }
                )}
              </p>
              <p css={legendRowStyle}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendSeverityHint',
                  { defaultMessage: 'A node ring shows its worst alert severity.' }
                )}
              </p>
            </EuiText>

            {/* Edges & markers */}
            <div css={legendSectionLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendEdgesLabel',
                { defaultMessage: 'Edges & markers' }
              )}
            </div>
            <EuiText size="xs" color="subdued">
              <p css={legendRowStyle}>
                <span css={legendLineSwatch(2)} />
                <span css={legendLineSwatch(5)} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendEdgeThickness',
                  { defaultMessage: 'Thicker line = more shared alerts' }
                )}
              </p>
              <p css={legendRowStyle}>
                <EuiIcon type="sortRight" size="m" color="subdued" aria-hidden={true} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendEdgePhrase',
                  { defaultMessage: 'Edge label describes what happened between entities' }
                )}
              </p>
              <p css={legendRowStyle}>
                <span
                  css={css`
                    display: inline-flex;
                    flex-shrink: 0;
                    width: ${euiTheme.size.base};
                    height: ${euiTheme.size.base};
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: ${euiTheme.colors.severity.risk};
                    color: ${euiTheme.colors.textInverse};
                    font-size: 9px;
                    font-weight: ${euiTheme.font.weight.bold};
                  `}
                >
                  {'3'}
                </span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendAlertBadge',
                  { defaultMessage: 'Badge on a node = its linked alert count' }
                )}
              </p>
              <p css={legendRowStyle}>
                <span
                  css={css`
                    display: inline-flex;
                    flex-shrink: 0;
                    width: ${euiTheme.size.base};
                    height: ${euiTheme.size.base};
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: ${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBasePlain};
                    font-size: 9px;
                    font-weight: ${euiTheme.font.weight.bold};
                    color: ${euiTheme.colors.textParagraph};
                  `}
                >
                  {'+N'}
                </span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendGroup',
                  { defaultMessage: '"+N" reveals more related entities' }
                )}
              </p>
              <p css={legendRowStyle}>
                <span css={legendSwatchDot(euiTheme.colors.success)} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendExpandedDot',
                  { defaultMessage: 'Green dot = branch already expanded' }
                )}
              </p>
              <p css={legendRowStyle}>
                <EuiIcon type="documents" size="m" color="subdued" aria-hidden={true} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.graph.clusterLegend',
                  { defaultMessage: 'Alert clusters open supporting evidence.' }
                )}
              </p>
            </EuiText>

            {/* Gestures & keyboard */}
            <div css={legendSectionLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendControlsLabel',
                { defaultMessage: 'Gestures & keyboard' }
              )}
            </div>
            <EuiText size="xs" color="subdued">
              <p css={legendRowStyle}>
                <EuiIcon type="keyboard" size="m" color="subdued" aria-hidden={true} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendZoomPan',
                  { defaultMessage: '⌘/Ctrl + scroll to zoom · drag to pan' }
                )}
              </p>
              <p css={legendRowStyle}>
                <EuiIcon type="crosshair" size="m" color="subdued" aria-hidden={true} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendClick',
                  { defaultMessage: 'Click to select · double-click or E to expand' }
                )}
              </p>
              <p css={legendRowStyle}>
                <EuiIcon type="sortRight" size="m" color="subdued" aria-hidden={true} />
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.legendKeyboard',
                  { defaultMessage: '← / → navigate · Enter select · Esc close' }
                )}
              </p>
            </EuiText>
          </div>
        ) : null}
      </div>

      {security ? (
        <div
          css={css`
            position: absolute;
            z-index: 5;
            top: 66px;
            left: ${euiTheme.size.m};
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: ${euiTheme.size.s};
            max-width: calc(100% - ${hasGraphDrawer ? '420px' : euiTheme.size.xl});
          `}
          data-test-subj="entityGraphSecuritySummary"
        >
          <EuiToolTip
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.securityCoverage',
              {
                defaultMessage:
                  '{shown, number} structured findings shown; {matching, number} match the graph time and severity filters. Security coverage is limited to {loaded, number} loaded alerts from the last 30 days. Other alerts remain available in entity findings.{partial, select, yes { Additional evidence may be outside this sample.} other {}}',
                values: {
                  shown:
                    securityNodes.length + (agentGraphVisible ? agentGraph.visibleActionCount : 0),
                  matching: matchingSecurityCount,
                  loaded: loadedSecurityFindings.length,
                  partial: security.result.partial ? 'yes' : 'no',
                },
              }
            )}
          >
            <EuiBadge
              tabIndex={0}
              color={securityReadable && matchingSecurityCount ? 'warning' : 'hollow'}
            >
              {securityLoading
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.securityLoading',
                    { defaultMessage: 'Loading security findings…' }
                  )
                : !securityReadable
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.securityUnavailable',
                    { defaultMessage: 'Security evidence unavailable' }
                  )
                : !showEvidence && !agentGraphVisible
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.securityHidden',
                    { defaultMessage: 'Security findings hidden' }
                  )
                : securityFilteredOut
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.securityFilteredOut',
                    { defaultMessage: 'No security findings match graph filters' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.securityEvents',
                    {
                      defaultMessage:
                        '{count, plural, one {# security finding} other {# security findings}}',
                      values: { count: matchingSecurityCount },
                    }
                  )}
            </EuiBadge>
          </EuiToolTip>
          {agentGraph.totalSessions > 0 ? (
            <>
              <EuiButtonEmpty
                size="xs"
                iconType="graphApp"
                onClick={() => setShowAgentActivity((visible) => !visible)}
                aria-pressed={showAgentActivity}
              >
                {showAgentActivity
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.graph.hideAgentActivity',
                      { defaultMessage: 'Hide agent activity' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.graph.showAgentActivity',
                      { defaultMessage: 'Show agent activity' }
                    )}
              </EuiButtonEmpty>
              {agentGraphVisible && agentGraph.totalSessions > 3 ? (
                <>
                  <EuiToolTip content={previousAgentSessionsLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="chevronSingleLeft"
                      size="s"
                      aria-label={previousAgentSessionsLabel}
                      isDisabled={agentSessionOffset === 0}
                      onClick={() =>
                        setAgentPage({
                          context: agentPageContext,
                          offset: Math.max(0, agentSessionOffset - 3),
                        })
                      }
                    />
                  </EuiToolTip>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.graph.agentSessionPage',
                      {
                        defaultMessage: 'Sessions {start}–{end} of {total}',
                        values: {
                          start: agentSessionOffset + 1,
                          end: agentSessionOffset + agentGraph.sessions.length,
                          total: agentGraph.totalSessions,
                        },
                      }
                    )}
                  </EuiText>
                  <EuiToolTip content={nextAgentSessionsLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="chevronSingleRight"
                      size="s"
                      aria-label={nextAgentSessionsLabel}
                      isDisabled={agentSessionOffset + 3 >= agentGraph.totalSessions}
                      onClick={() =>
                        setAgentPage({ context: agentPageContext, offset: agentSessionOffset + 3 })
                      }
                    />
                  </EuiToolTip>
                </>
              ) : null}
            </>
          ) : null}
          {securitySequences.length > 1 && securityReadable ? (
            <EuiSelect
              compressed
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.securitySequence',
                { defaultMessage: 'Security findings to show' }
              )}
              value={securitySequence?.id}
              options={securitySequences.map((sequence) => ({
                value: sequence.id,
                text: `${sequence.findings[0].title} · ${new Date(
                  sequence.findings[0].timestamp
                ).toLocaleString()}`,
              }))}
              onChange={(event) => {
                setSecuritySelection({ context: securityContext, sequence: event.target.value });
                setSelectedSecurityEvent(undefined);
              }}
              css={css`
                max-width: 220px;
              `}
            />
          ) : null}
          {agentGraph.sessionOnlyFindingCount > 0 ? (
            <EuiButtonEmpty size="xs" onClick={() => onInspectEntity(toRelatedEntity(rootNode))}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.unlinkedAgentFindings',
                {
                  defaultMessage:
                    '{count, plural, one {# finding without a tool link} other {# findings without tool links}}',
                  values: { count: agentGraph.sessionOnlyFindingCount },
                }
              )}
            </EuiButtonEmpty>
          ) : null}
          <EuiButtonEmpty size="xs" onClick={() => onInspectEntity(toRelatedEntity(rootNode))}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.allFindings',
              { defaultMessage: 'All findings' }
            )}
          </EuiButtonEmpty>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        width="100%"
        height="100%"
        data-test-subj="entityIntelligenceGraphCanvas"
        role="img"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.graph.ariaLabel',
          { defaultMessage: 'Relationship graph for {name}', values: { name: entity.name } }
        )}
        css={css`
          display: block;
          cursor: ${isPanning ? 'grabbing' : 'default'};
          touch-action: pan-y pinch-zoom;
        `}
        onPointerDown={(event) => {
          const target = event.target;
          if (
            event.pointerType !== 'mouse' ||
            event.button !== 0 ||
            !(target instanceof Element) ||
            target.getAttribute('data-graph-pan-surface') !== 'true'
          ) {
            return;
          }
          markInteracted();
          dragGesture.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            panX: pan.x,
            panY: pan.y,
            hasMoved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const gesture = dragGesture.current;
          if (!gesture || gesture.pointerId !== event.pointerId) return;
          const deltaX = event.clientX - gesture.startX;
          const deltaY = event.clientY - gesture.startY;
          if (!gesture.hasMoved && Math.hypot(deltaX, deltaY) < 5) return;
          gesture.hasMoved = true;
          setIsPanning(true);
          const scale = canvas.width / event.currentTarget.getBoundingClientRect().width;
          setPan({
            x: gesture.panX + deltaX * scale,
            y: gesture.panY + deltaY * scale,
          });
        }}
        onPointerUp={(event) => {
          const gesture = dragGesture.current;
          if (!gesture || gesture.pointerId !== event.pointerId) return;
          if (!gesture.hasMoved) {
            setSelectedNodeId(undefined);
            setSelectedEdge(undefined);
            setSelectedAlertId(undefined);
          }
          dragGesture.current = undefined;
          setIsPanning(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragGesture.current = undefined;
          setIsPanning(false);
        }}
      >
        <defs>
          <filter id="entity-intelligence-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          width={canvas.width}
          height={canvas.height}
          fill="transparent"
          data-graph-pan-surface="true"
        />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {agentLayout && securityRootPosition ? (
            <text
              data-test-subj="entityGraphIdentityActivityLabel"
              x={
                visibleEntityNodes.length > 1
                  ? Math.min(...[...positions.values()].map(({ x }) => x)) - 60
                  : securityRootPosition.x
              }
              y={Math.min(...[...positions.values()].map(({ y }) => y)) - 80}
              textAnchor={visibleEntityNodes.length > 1 ? 'start' : 'middle'}
              fill={euiTheme.colors.textSubdued}
              fontSize={14}
              fontWeight={600}
              pointerEvents="none"
            >
              <title>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.graph.identityActivityDescription',
                  {
                    defaultMessage:
                      'Identity relationships from shared alerts and event context. These links alone do not establish that a person performed an action directly.',
                  }
                )}
              </title>
              {visibleEntityNodes.length > 1
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.identityActivity',
                    { defaultMessage: 'Account activity & relationships' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.identityRole',
                    {
                      defaultMessage: '{kind} identity',
                      values: { kind: kindLabel(rootNode.kind) },
                    }
                  )}
            </text>
          ) : null}
          <circle
            cx={
              securityLaneVisible || agentLayout
                ? securityRootPosition?.x ?? availableCenter.x
                : availableCenter.x
            }
            cy={
              securityLaneVisible || agentLayout
                ? securityRootPosition?.y ?? availableCenter.y
                : availableCenter.y
            }
            r={
              securityLaneVisible
                ? 140
                : Math.max(200, Math.min(330, availableCenter.x * 0.62, canvas.height * 0.34))
            }
            fill="none"
            stroke={transparentize(euiTheme.colors.borderBasePlain, 0.22)}
            strokeDasharray="2 12"
            pointerEvents="none"
          />

          {visibleEdges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const color = getAlertSeverityColor(euiTheme, edge.worstSeverity);
            const edgeLength = Math.round(Math.hypot(target.x - source.x, target.y - source.y));
            const strokeWidth = edgeStrokeWidth(
              edge.alertCount,
              maxEdgeAlertCount,
              edge.id === selectedEdge?.id
            );
            const phrase = edgeContextSummary(edge.context, edge.alertCount);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            const chipHidden = hiddenLabels.has(`chip:${edge.id}`) && edge.id !== selectedEdge?.id;
            const showPhrase = !chipHidden && (zoom >= 0.75 || edge.id === selectedEdge?.id);
            return (
              <g
                key={edge.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  markInteracted();
                  setSelectedEdge(edge);
                  setSelectedNodeId(undefined);
                  setSelectedAlertId(undefined);
                  setContextDrawerOpen(true);
                  onEvidenceOpen();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setSelectedEdge(edge);
                    setContextDrawerOpen(true);
                    onEvidenceOpen();
                  }
                }}
              >
                <title>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.edgeSummary',
                    {
                      defaultMessage:
                        '{source} → {target} · {phrase} · {count, plural, one {# shared alert} other {# shared alerts}} · worst severity {severity} · last {timeRange} · click to view evidence',
                      values: {
                        source: nodeDisplayName(graph.nodes, edge.source),
                        target: nodeDisplayName(graph.nodes, edge.target),
                        phrase,
                        count: edge.alertCount,
                        severity: edge.worstSeverity ?? 'unknown',
                        timeRange,
                      },
                    }
                  )}
                </title>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="transparent"
                  strokeWidth={18}
                />
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={transparentize(color, 0.55)}
                  strokeWidth={strokeWidth}
                  css={edgeDraw}
                  style={{ '--edge-length': `${edgeLength}px` } as React.CSSProperties}
                />
                {/* Directional flow overlay conveys source→target orientation. */}
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={transparentize(color, 0.15)}
                  strokeWidth={Math.max(1.5, strokeWidth - 1)}
                  strokeLinecap="round"
                  pointerEvents="none"
                  css={edgeFlow}
                />
                {showPhrase ? (
                  <g transform={`translate(${midX} ${midY})`}>
                    <rect
                      x={-Math.min(96, Math.max(46, phrase.length * 3.4))}
                      y={-11}
                      width={Math.min(192, Math.max(92, phrase.length * 6.8))}
                      height={22}
                      rx={11}
                      fill={transparentize(euiTheme.colors.backgroundBasePlain, 0.92)}
                      stroke={transparentize(color, 0.4)}
                    />
                    <text
                      y={4}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill={euiTheme.colors.textParagraph}
                    >
                      {phrase.length > 30 ? `${phrase.slice(0, 29)}…` : phrase}
                    </text>
                  </g>
                ) : chipHidden ? null : (
                  <g transform={`translate(${midX} ${midY})`}>
                    <circle
                      r={13}
                      fill={euiTheme.colors.backgroundBasePlain}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <text
                      y={4}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                      fill={euiTheme.colors.textParagraph}
                    >
                      {edge.alertCount > 99 ? '99+' : edge.alertCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {alertClusters.map((cluster, index) => {
            const parent = positions.get(cluster.parentId);
            if (!parent) return null;
            const clusterPosition = getClusterPosition(
              parent,
              availableCenter,
              cluster.parentId,
              rootNode.id
            );
            const worstSeverity = cluster.alerts.reduce<AlertSeverity | undefined>(
              (worst, alertNode) => {
                const severity = alertNode.alert.severity;
                if (!severity) return worst;
                return !worst || ALL_SEVERITIES.indexOf(severity) > ALL_SEVERITIES.indexOf(worst)
                  ? severity
                  : worst;
              },
              undefined
            );
            const color = getAlertSeverityColor(euiTheme, worstSeverity);
            return (
              <g
                key={`cluster:${cluster.parentId}`}
                css={nodePop(index)}
                role="button"
                tabIndex={0}
                data-test-subj={`entityIntelligenceAlertCluster-${cluster.parentId}`}
                onClick={() => {
                  const parentNode = visibleEntityNodes.find(({ id }) => id === cluster.parentId);
                  if (parentNode) openEvidenceDrawer(parentNode);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    const parentNode = visibleEntityNodes.find(({ id }) => id === cluster.parentId);
                    if (parentNode) openEvidenceDrawer(parentNode);
                  }
                }}
              >
                <line
                  x1={parent.x}
                  y1={parent.y}
                  x2={clusterPosition.x}
                  y2={clusterPosition.y}
                  stroke={transparentize(color, 0.45)}
                  strokeDasharray="3 6"
                />
                <circle
                  cx={clusterPosition.x}
                  cy={clusterPosition.y}
                  r={22}
                  fill={euiTheme.colors.backgroundBasePlain}
                  stroke={color}
                  strokeWidth={2}
                />
                <EuiIcon
                  type="documents"
                  x={clusterPosition.x - 8}
                  y={clusterPosition.y - 11}
                  width={16}
                  height={16}
                  color={color}
                  aria-hidden={true}
                />
                <text
                  x={clusterPosition.x}
                  y={clusterPosition.y + 13}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill={euiTheme.colors.textParagraph}
                >
                  {cluster.alerts.length > 99 ? '99+' : cluster.alerts.length}
                </text>
              </g>
            );
          })}

          {visibleGroupNodes.map((group, index) => {
            const parent = positions.get(group.parentId);
            if (!parent) return null;
            const outwardAngle =
              group.parentId === rootNode.id
                ? -Math.PI / 2
                : Math.atan2(parent.y - availableCenter.y, parent.x - availableCenter.x);
            const groupPosition = {
              x: parent.x + Math.cos(outwardAngle) * 96,
              y: parent.y + Math.sin(outwardAngle) * 96,
            };
            const color = getAlertSeverityColor(euiTheme, group.hidden[0]?.worstSeverity);
            const label = group.hidden.length > 99 ? '99+' : `+${group.hidden.length}`;
            return (
              <g
                key={group.id}
                css={nodePop(index)}
                role="button"
                tabIndex={0}
                data-test-subj={`entityIntelligenceGraphGroup-${group.parentId}`}
                onClick={() => revealGroup(group.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') revealGroup(group.id);
                }}
              >
                <title>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.showMoreNodes',
                    {
                      defaultMessage:
                        '{count, plural, one {# more related entity} other {# more related entities}} · click to reveal',
                      values: { count: group.hidden.length },
                    }
                  )}
                </title>
                <line
                  x1={parent.x}
                  y1={parent.y}
                  x2={groupPosition.x}
                  y2={groupPosition.y}
                  stroke={transparentize(color, 0.45)}
                  strokeDasharray="1 5"
                />
                <circle
                  cx={groupPosition.x}
                  cy={groupPosition.y}
                  r={20}
                  fill={euiTheme.colors.backgroundBaseSubdued}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                <text
                  x={groupPosition.x}
                  y={groupPosition.y + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={euiTheme.colors.textParagraph}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {securityRootPosition && securityNodes.length ? (
            <RelationshipSecurityNodes
              nodes={securityNodes}
              root={securityRootPosition}
              recordedOrder={hasRecordedSecurityOrder(securitySequence)}
              onSelect={(finding) => {
                markInteracted();
                setSelectedSecurityEvent({
                  context: securityContext,
                  id: JSON.stringify([finding.source.index, finding.source.id]),
                });
              }}
            />
          ) : null}

          {agentLayout ? (
            <RelationshipAgentNodes
              layout={agentLayout}
              onSelectFinding={(finding) => {
                markInteracted();
                setSelectedSecurityEvent({
                  context: securityContext,
                  id: JSON.stringify([finding.source.index, finding.source.id]),
                });
              }}
            />
          ) : null}

          {visibleEntityNodes.map((node, index) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const isRoot = node.id === rootNode.id;
            const radius = isRoot ? ROOT_RADIUS : ENTITY_RADIUS;
            const selected = node.id === selectedNodeId;
            const focused = node.id === focusedNodeId;
            const matched = searchMatch !== '' && node.name.toLowerCase().includes(searchMatch);
            const externallyHighlighted = highlightedNodeKey === node.id;
            const color = isRoot
              ? getRiskLevelColor(euiTheme, entity.riskLevel)
              : getAlertSeverityColor(euiTheme, node.worstSeverity);
            const forceLabel =
              selected ||
              focused ||
              matched ||
              externallyHighlighted ||
              (isRoot && agentGraphVisible);
            const showLabel = forceLabel || (zoom >= 0.68 && !hiddenLabels.has(node.id));
            const badge = badgeOffset(radius);
            return (
              <g
                key={node.id}
                css={nodePop(index)}
                role="button"
                tabIndex={0}
                onMouseEnter={() => onNodeHighlight?.(node.id)}
                onMouseLeave={() => onNodeHighlight?.(undefined)}
                onClick={() => {
                  markInteracted();
                  setSelectedNodeId(node.id);
                  setSelectedEdge(undefined);
                  setSelectedAlertId(undefined);
                }}
                onDoubleClick={() => expandNode(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setSelectedNodeId(node.id);
                  } else if (event.key.toLowerCase() === 'e') {
                    expandNode(node);
                  } else if (event.key.toLowerCase() === 'f') {
                    focusNode(node.id);
                  }
                }}
                data-test-subj={`entityIntelligenceGraphNode-${node.name}`}
                data-selected={selected}
                data-focused={focused}
                data-highlighted={externallyHighlighted}
              >
                <title>{`${kindLabel(node.kind)} · ${node.alertCount} linked alerts`}</title>
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={radius + (focused || externallyHighlighted ? 16 : 11)}
                  fill={transparentize(
                    externallyHighlighted ? euiTheme.colors.primary : color,
                    focused || externallyHighlighted ? 0.22 : 0.1
                  )}
                  filter={
                    focused || externallyHighlighted ? 'url(#entity-intelligence-glow)' : undefined
                  }
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={radius}
                  fill={euiTheme.colors.backgroundBasePlain}
                  stroke={
                    selected || matched || externallyHighlighted ? euiTheme.colors.primary : color
                  }
                  strokeWidth={selected || matched || externallyHighlighted ? 4 : isRoot ? 3 : 2}
                />
                <EuiIcon
                  type={nodeIcon(node.kind)}
                  x={position.x - (isRoot ? 12 : 10)}
                  y={position.y - (isRoot ? 12 : 10)}
                  width={isRoot ? 24 : 20}
                  height={isRoot ? 24 : 20}
                  color={color}
                  aria-hidden={true}
                />
                {node.alertCount > 0 ? (
                  <g transform={`translate(${position.x + badge.x} ${position.y + badge.y})`}>
                    <circle r={11} fill={color} stroke={euiTheme.colors.backgroundBasePlain} />
                    <text
                      y={4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill={euiTheme.colors.textInverse}
                    >
                      {node.alertCount > 99 ? '99+' : node.alertCount}
                    </text>
                  </g>
                ) : null}
                {showLabel ? (
                  <g transform={`translate(${position.x} ${position.y + radius + 23})`}>
                    <rect
                      x={
                        -Math.min(
                          isRoot && agentGraphVisible ? 130 : 82,
                          Math.max(42, node.name.length * 3.8)
                        )
                      }
                      y={-14}
                      width={Math.min(
                        isRoot && agentGraphVisible ? 260 : 164,
                        Math.max(84, node.name.length * 7.6)
                      )}
                      height={25}
                      rx={12}
                      fill={transparentize(euiTheme.colors.backgroundBasePlain, 0.9)}
                      stroke={transparentize(euiTheme.colors.borderBasePlain, 0.65)}
                    />
                    <text textAnchor="middle" y={3} css={labelStyle}>
                      {node.name.length > (isRoot && agentGraphVisible ? 34 : 22)
                        ? `${node.name.slice(0, isRoot && agentGraphVisible ? 33 : 21)}…`
                        : node.name}
                    </text>
                  </g>
                ) : null}
                {isRoot && agentGraphVisible && typeof entity.riskScoreNorm === 'number' ? (
                  <text
                    x={position.x}
                    y={position.y + radius + 48}
                    textAnchor="middle"
                    fontSize={11}
                    fill={color}
                  >
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.graph.agentEntityRisk',
                      {
                        defaultMessage: '{level} risk · {score} / 100',
                        values: {
                          level: entity.riskLevel ?? '',
                          score: entity.riskScoreNorm.toFixed(1),
                        },
                      }
                    )}
                  </text>
                ) : null}
                {graph.expandedNodeIds.has(node.id) ? (
                  <circle
                    cx={position.x - radius + 4}
                    cy={position.y - radius + 4}
                    r={5}
                    fill={euiTheme.colors.success}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {selectedNode && toolbarPlacement && !contextDrawerOpen ? (
        <div
          css={actionStripStyle}
          style={{ left: `${toolbarPlacement.x}px`, top: `${toolbarPlacement.y}px` }}
          data-test-subj="entityIntelligenceGraphNodeActions"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <EuiToolTip disableScreenReaderOutput content={COPY.focus}>
            <EuiButtonIcon
              iconType="crosshair"
              aria-label={COPY.focus}
              onClick={() => focusNode(selectedNode.id)}
            />
          </EuiToolTip>
          <EuiToolTip disableScreenReaderOutput content={COPY.expand}>
            <EuiButtonIcon
              iconType="maximize"
              aria-label={COPY.expand}
              disabled={
                selectedNode.identifierValue === '' ||
                graph.expandedNodeIds.has(selectedNode.id) ||
                (!!expansionTarget && !isError)
              }
              onClick={() => expandNode(selectedNode)}
            />
          </EuiToolTip>
          <EuiToolTip disableScreenReaderOutput content={COPY.evidence}>
            <EuiButtonIcon
              iconType="document"
              aria-label={COPY.evidence}
              onClick={() => openEvidenceDrawer(selectedNode)}
            />
          </EuiToolTip>
          <EuiToolTip disableScreenReaderOutput content={COPY.inspect}>
            <EuiButtonIcon
              iconType="inspect"
              aria-label={COPY.inspect}
              disabled={selectedNode.kind === 'ip'}
              onClick={() => {
                setContextDrawerOpen(false);
                onInspectEntity(toRelatedEntity(selectedNode));
              }}
            />
          </EuiToolTip>
          <EuiToolTip
            disableScreenReaderOutput
            content={copiedNodeId === selectedNode.id ? COPY.copied : COPY.copy}
          >
            <EuiButtonIcon
              iconType={copiedNodeId === selectedNode.id ? 'check' : 'copy'}
              aria-label={copiedNodeId === selectedNode.id ? COPY.copied : COPY.copy}
              onClick={() => copyNodeValue(selectedNode)}
            />
          </EuiToolTip>
          {onHuntEntity ? (
            <EuiToolTip disableScreenReaderOutput content={COPY.hunt}>
              <EuiButtonIcon
                iconType="comment"
                aria-label={COPY.hunt}
                disabled={selectedNode.kind === 'ip'}
                onClick={() => huntNode(selectedNode)}
              />
            </EuiToolTip>
          ) : null}
          {graph.expandedNodeIds.has(selectedNode.id) && selectedNode.id !== rootNode.id ? (
            <EuiToolTip disableScreenReaderOutput content={COPY.collapse}>
              <EuiButtonIcon
                iconType="minimize"
                aria-label={COPY.collapse}
                onClick={() => setGraph((current) => collapseBranch(current, selectedNode.id))}
              />
            </EuiToolTip>
          ) : null}
          {isLoading && expansionTarget?.id === selectedNode.id ? <EuiLoadingSpinner /> : null}
        </div>
      ) : null}

      {securityDetails ? (
        <FindingDetails
          finding={securityDetails}
          onClose={() => setSelectedSecurityEvent(undefined)}
          onInvestigateEntity={security?.onInvestigateEntity}
          entityTargets={security?.entityTargets}
        />
      ) : null}

      {showOnboarding && !agentGraphVisible ? (
        <EuiPanel
          paddingSize="s"
          css={css`
            position: absolute;
            z-index: 5;
            left: 50%;
            bottom: ${euiTheme.size.xl};
            transform: translateX(-50%);
            border-radius: 999px;
            background: ${transparentize(euiTheme.colors.backgroundBasePlain, 0.88)};
            pointer-events: none;
          `}
        >
          <EuiText size="xs" color="subdued">
            {COPY.onboarding}
          </EuiText>
        </EuiPanel>
      ) : null}

      <div
        css={css`
          position: absolute;
          z-index: 5;
          left: ${euiTheme.size.m};
          bottom: ${euiTheme.size.s};
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          font-size: 11px;
          color: ${euiTheme.colors.textSubdued};
        `}
      >
        <span>
          {agentLayout
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.hybridNodeCount',
                {
                  defaultMessage:
                    '{count} / {cap} relationship nodes · {agentNodes} agent activity nodes',
                  values: {
                    count: graph.nodes.length,
                    cap: GRAPH_NODE_CAP,
                    agentNodes:
                      agentLayout.agents.length +
                      agentLayout.sessions.length +
                      agentLayout.actions.length,
                  },
                }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.visibleNodeCount',
                {
                  defaultMessage: '{count} of {cap} nodes',
                  values: { count: graph.nodes.length, cap: GRAPH_NODE_CAP },
                }
              )}
        </span>
        {graph.capped ? (
          <EuiBadge color="warning">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.capReached',
              { defaultMessage: 'Limit reached' }
            )}
          </EuiBadge>
        ) : null}
      </div>

      {failedExpansionNodeId ? (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.graph.branchError',
            { defaultMessage: 'This branch could not be loaded.' }
          )}
          css={css`
            position: absolute;
            z-index: 8;
            left: ${euiTheme.size.m};
            bottom: ${euiTheme.size.xl};
          `}
        >
          <EuiButtonEmpty size="xs" onClick={retryExpansion}>
            {COPY.retry}
          </EuiButtonEmpty>
        </EuiCallOut>
      ) : null}

      {showNoRelationships ? (
        <div
          css={css`
            position: absolute;
            z-index: 5;
            left: 50%;
            bottom: ${euiTheme.size.xxl};
            transform: translateX(-50%);
            max-width: 340px;
            text-align: center;
            pointer-events: auto;
          `}
          data-test-subj="entityIntelligenceGraphNoRelationships"
        >
          <EuiPanel paddingSize="m" hasShadow>
            <EuiIcon type="search" size="l" color="subdued" aria-hidden={true} />
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.noRelationshipsTitle',
                  {
                    defaultMessage:
                      'No related entities share detection alerts with {name} in the last {timeRange}.',
                    values: { name: entity.name, timeRange },
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            {timeRange !== '90d' ? (
              <EuiButton
                size="s"
                iconType="refreshTime"
                onClick={() => setTimeRange('90d')}
                data-test-subj="entityIntelligenceGraphWidenRange"
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.widenTimeRange',
                  { defaultMessage: 'Widen to 90 days' }
                )}
              </EuiButton>
            ) : (
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.noRelationshipsHint',
                    {
                      defaultMessage:
                        'Try relaxing the entity type or severity filters to surface more connections.',
                    }
                  )}
                </p>
              </EuiText>
            )}
          </EuiPanel>
        </div>
      ) : null}

      {contextDrawerOpen ? (
        <aside css={drawerStyle} aria-label={COPY.evidence}>
          <EuiToolTip
            disableScreenReaderOutput
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.graph.closeEvidence',
              { defaultMessage: 'Close evidence details' }
            )}
          >
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.closeEvidence',
                { defaultMessage: 'Close evidence details' }
              )}
              onClick={closeContextDrawer}
              css={css`
                position: absolute;
                top: ${euiTheme.size.m};
                right: ${euiTheme.size.m};
              `}
            />
          </EuiToolTip>
          <EuiTitle size="s">
            <h3>
              {selectedEdge
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.relationshipEvidence',
                    { defaultMessage: 'Relationship evidence' }
                  )
                : selectedAlert
                ? selectedAlert.title ?? selectedAlert.ruleName
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.entityEvidence',
                    { defaultMessage: 'Alert evidence' }
                  )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          {selectedEdge ? (
            <>
              <EuiText size="s">
                <p>
                  <strong>{nodeDisplayName(graph.nodes, selectedEdge.source)}</strong> {'→'}{' '}
                  <strong>{nodeDisplayName(graph.nodes, selectedEdge.target)}</strong>
                </p>
              </EuiText>
              <EuiText size="s" color="subdued">
                <p>{edgeContextSummary(selectedEdge.context, selectedEdge.alertCount)}</p>
              </EuiText>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={getAlertSeverityColor(euiTheme, selectedEdge.worstSeverity)}>
                    {selectedEdge.worstSeverity ?? 'unknown'}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.graph.sharedAlerts',
                      {
                        defaultMessage: '{count} shared alerts · {timeRange}',
                        values: { count: selectedEdge.alertCount, timeRange },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <RelationshipContextBreakdown context={selectedEdge.context} />
            </>
          ) : selectedNode ? (
            <>
              <EuiText size="s" color="subdued">
                <p>
                  {kindLabel(selectedNode.kind)} {'·'} {selectedNode.name} {'·'} {totalAlerts}{' '}
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.graph.alertsInRange',
                    { defaultMessage: 'alerts in range' }
                  )}
                </p>
              </EuiText>
              <RelationshipContextBreakdown context={selectedNode.context} />
            </>
          ) : null}

          <EuiSpacer size="m" />
          {isEvidenceLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : isEvidenceError ? (
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              title={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.graph.evidenceError',
                { defaultMessage: 'Alert evidence could not be loaded.' }
              )}
            >
              <EuiButtonEmpty size="xs" onClick={() => refetchEvidence()}>
                {COPY.retry}
              </EuiButtonEmpty>
            </EuiCallOut>
          ) : alerts.length === 0 ? (
            <EuiText size="s" color="subdued">
              <p>{COPY.noEvidence}</p>
            </EuiText>
          ) : (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.s};
              `}
            >
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => setSelectedAlertId(`alert:${alert.id}`)}
                  css={css`
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr);
                    gap: ${euiTheme.size.s};
                    width: 100%;
                    padding: ${euiTheme.size.s};
                    border: ${euiTheme.border.thin};
                    border-radius: ${euiTheme.border.radius.medium};
                    background: ${selectedAlertId === `alert:${alert.id}`
                      ? transparentize(euiTheme.colors.primary, 0.08)
                      : euiTheme.colors.backgroundBaseSubdued};
                    color: ${euiTheme.colors.textParagraph};
                    text-align: left;
                    cursor: pointer;
                  `}
                >
                  <span
                    css={css`
                      width: 9px;
                      height: 9px;
                      margin-top: 5px;
                      border-radius: 50%;
                      background: ${getAlertSeverityColor(euiTheme, alert.severity)};
                    `}
                  />
                  <span>
                    <strong>{alert.ruleName}</strong>
                    <br />
                    <small>
                      {alert.severity ?? 'unknown'} {'·'} {alert.timestamp ?? 'time unavailable'}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedAlert ? (
            <>
              <EuiSpacer size="l" />
              <EuiPanel hasBorder paddingSize="m">
                <EuiTitle size="xs">
                  <h4>{selectedAlert.title ?? selectedAlert.ruleName}</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={getAlertSeverityColor(euiTheme, selectedAlert.severity)}>
                      {selectedAlert.severity ?? 'unknown'}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge>{selectedAlert.status ?? 'unknown status'}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="xs">
                  <dl
                    css={css`
                      display: grid;
                      grid-template-columns: 92px minmax(0, 1fr);
                      gap: ${euiTheme.size.xs} ${euiTheme.size.s};
                      margin: 0;
                      overflow-wrap: anywhere;
                    `}
                  >
                    <dt>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.graph.timeField',
                        { defaultMessage: 'Time' }
                      )}
                    </dt>
                    <dd>{selectedAlert.timestamp ?? 'unavailable'}</dd>
                    <dt>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.graph.entitiesField',
                        { defaultMessage: 'Entities' }
                      )}
                    </dt>
                    <dd>
                      {[
                        ...selectedAlert.users,
                        ...selectedAlert.hosts,
                        ...selectedAlert.services,
                      ].join(', ') || 'none recorded'}
                    </dd>
                    <dt>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.graph.networkField',
                        { defaultMessage: 'Network' }
                      )}
                    </dt>
                    <dd>
                      {[...selectedAlert.sourceIps, ...selectedAlert.destinationIps].join(' → ') ||
                        'none recorded'}
                    </dd>
                    <dt>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.graph.processField',
                        { defaultMessage: 'Process' }
                      )}
                    </dt>
                    <dd>
                      {selectedAlert.processName
                        ? `${selectedAlert.processName}${
                            selectedAlert.processExecutable
                              ? ` (${selectedAlert.processExecutable})`
                              : ''
                          }`
                        : 'none recorded'}
                    </dd>
                    <dt>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.graph.eventField',
                        { defaultMessage: 'Event' }
                      )}
                    </dt>
                    <dd>
                      {selectedAlert.eventKind ?? 'alert'}{' '}
                      {selectedAlert.eventCategory.length
                        ? `· ${selectedAlert.eventCategory.join(', ')}`
                        : ''}
                    </dd>
                  </dl>
                </EuiText>
              </EuiPanel>
            </>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
};
