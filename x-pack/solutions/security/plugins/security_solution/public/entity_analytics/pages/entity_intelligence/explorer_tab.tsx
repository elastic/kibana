/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import { useKibana } from '../../../common/lib/kibana';
import { useNavigateToAlertsPageWithFilters } from '../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import type { IntelligenceEntity } from './common';
import { getRiskLevelFromScore } from './common';
import { IntelligencePanel, PanelEmptyState, RiskLevelBadge, SectionLabel } from './components';
import { useIntelligenceEntityList } from './hooks/use_intelligence_entity_list';
import type { RelatedEntity } from './hooks/use_entity_relationships';
import { EntityDossierPanel } from './entity_dossier_panel';
import { EntityInvestigationCanvas } from './entity_investigation_canvas';
import { resolveExplorerEntity } from './explorer_entity_resolution';
import { EntityTimelinePanel } from './entity_timeline_panel';
import { entityRefKey } from './entity_timeline';
import type { TimelineEntityRef } from './entity_timeline';
import { RelationshipGraph } from './relationship_graph';
import { AiExplainFlyout } from './ai_explain_flyout';
import { useAiExplain } from './hooks/use_ai_explain';
import type { ExplainAction, ExplainChainStep, ExplainEntityRef } from './ai_explain';
import type { TimeRangePreset } from './graph_state';
import { staggeredEntrance } from './animations';

type TypeFilter = 'all' | EntityType.user | EntityType.host | EntityType.service;

const TYPE_FILTER_OPTIONS = [
  {
    id: 'all',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.allTypes', {
      defaultMessage: 'All',
    }),
  },
  {
    id: EntityType.user,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.users', {
      defaultMessage: 'Users',
    }),
  },
  {
    id: EntityType.host,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.hosts', {
      defaultMessage: 'Hosts',
    }),
  },
  {
    id: EntityType.service,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.explorer.services', {
      defaultMessage: 'Services',
    }),
  },
];

const escapeQueryString = (value: string): string => value.replace(/["\\]/g, '\\$&');

/** CSS width tokens for the explorer's right-hand panels. */
export interface ExplorerRightPanelLayout {
  /** Timeline column width (CSS length). */
  timelineWidth: string;
  /** Dossier column width (CSS length). */
  dossierWidth: string;
  /** `right` offset for the dossier so it docks left of the timeline. */
  dossierRight: string;
  /** Total right-hand space the graph must reserve. */
  reservedRight: string;
}

/**
 * Pure layout math for the graph | dossier | timeline arrangement. Keeps the
 * three regions from overlapping: when the timeline is open the dossier docks
 * to the *left* of it; the graph reserves the combined width of whatever is
 * open. Expanded timeline is capped narrower while the dossier is docked so all
 * three fit. Returns CSS length strings (theme gap passed in for spacing).
 */
export const computeRightPanelLayout = ({
  showTimeline,
  isTimelineExpanded,
  showDossier,
  gap,
}: {
  showTimeline: boolean;
  isTimelineExpanded: boolean;
  showDossier: boolean;
  gap: string;
}): ExplorerRightPanelLayout => {
  const dossierWidth = 'min(400px, 34%)';
  const timelineWidth = isTimelineExpanded
    ? showDossier
      ? 'min(520px, 46%)'
      : 'min(760px, 62%)'
    : 'min(440px, 42%)';
  const dossierRight = showTimeline ? `calc(${timelineWidth} + ${gap})` : gap;
  const reservedRight = showTimeline
    ? showDossier
      ? `calc(${timelineWidth} + ${dossierWidth})`
      : timelineWidth
    : showDossier
    ? dossierWidth
    : '0';
  return { timelineWidth, dossierWidth, dossierRight, reservedRight };
};

export interface ExplorerTabProps {
  /** Entity handed off from another tab (e.g. Overview spotlight drill-in). */
  initialEntity: IntelligenceEntity | undefined;
  entityId?: string;
  onSelectEntity?: (entity: IntelligenceEntity) => void;
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({
  initialEntity,
  entityId,
  onSelectEntity,
}) => {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<IntelligenceEntity | undefined>(
    !entityId || initialEntity?.id === entityId ? initialEntity : undefined
  );
  const [inspectedEntity, setInspectedEntity] = useState<IntelligenceEntity | undefined>();
  const [isEntityRailOpen, setIsEntityRailOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [graphTimeRange, setGraphTimeRange] = useState<TimeRangePreset>('30d');
  // Shared cross-highlight between the timeline and the graph. Holds a graph
  // node key (`<kind>:<name>`) so hovering a step pulses the node and vice versa.
  const [highlightedNodeKey, setHighlightedNodeKey] = useState<string | undefined>();
  const [focusRequest, setFocusRequest] = useState<{ key: string; nonce: number } | undefined>();
  const [agentActivityRequest, setAgentActivityRequest] = useState<{
    entityId: string;
    nonce: number;
  }>();
  const agentActivityRequestRef = useRef(agentActivityRequest);
  agentActivityRequestRef.current = agentActivityRequest;
  // AI "Explain this" surface — a single large flyout shared by the graph and
  // timeline entry points, opened with a fully-assembled prompt + subtitle.
  const [explainSubtitle, setExplainSubtitle] = useState<string | undefined>();
  const [explainPrompt, setExplainPrompt] = useState<string | undefined>();
  const [explainOpen, setExplainOpen] = useState(false);
  const navigateToAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();
  const {
    explain,
    result: explainResult,
    rawResult: explainRaw,
    isGenerating: isExplaining,
    error: explainError,
    hasConnector: hasExplainConnector,
    connectorName: explainConnectorName,
    reset: resetExplain,
  } = useAiExplain();

  // Adopt handed-off selection (e.g. clicking "Investigate" on the Overview tab
  // while the Explorer tab is already mounted with a different selection).
  useEffect(() => {
    if (initialEntity && (!entityId || initialEntity.id === entityId)) {
      setSelectedEntity(initialEntity);
      setInspectedEntity(
        entityId && agentActivityRequestRef.current?.entityId !== initialEntity.id
          ? initialEntity
          : undefined
      );
      setIsTimelineOpen(
        !entityId && agentActivityRequestRef.current?.entityId !== initialEntity.id
      );
    }
  }, [initialEntity, entityId]);

  const requestedEntity = useIntelligenceEntityList({
    entityTypes: [EntityType.user, EntityType.host, EntityType.service, EntityType.generic],
    filterQuery: entityId ? JSON.stringify({ term: { 'entity.id': entityId } }) : undefined,
    perPage: 1,
    enabled: Boolean(entityId && entityId.length <= 1000) && initialEntity?.id !== entityId,
  });
  const requestedMatch =
    !requestedEntity.isError && requestedEntity.total === 1
      ? requestedEntity.entities.find((entity) => entity.id === entityId)
      : undefined;
  useEffect(() => {
    if (!entityId || initialEntity?.id === entityId) return;
    setSelectedEntity(requestedMatch);
    setInspectedEntity(
      agentActivityRequestRef.current?.entityId === requestedMatch?.id ? undefined : requestedMatch
    );
    setIsTimelineOpen(false);
  }, [entityId, initialEntity?.id, requestedMatch]);

  useDebounce(() => setSearchQuery(searchInput), 300, [searchInput]);

  const entityTypes = useMemo(
    () =>
      typeFilter === 'all' ? [EntityType.user, EntityType.host, EntityType.service] : [typeFilter],
    [typeFilter]
  );

  const filterQuery = useMemo(
    () =>
      searchQuery.trim() !== ''
        ? `entity.name: *${escapeQueryString(searchQuery.trim())}*`
        : undefined,
    [searchQuery]
  );

  const { entities, isLoading } = useIntelligenceEntityList({
    entityTypes,
    filterQuery,
    perPage: 25,
  });

  const investigationTargets = useMemo(
    () =>
      selectedEntity
        ? [selectedEntity, ...entities.filter((candidate) => candidate.id !== selectedEntity.id)]
        : entities,
    [entities, selectedEntity]
  );
  const investigateSecurityEntity = useCallback(
    (targetId: string) => {
      const target = investigationTargets.find((candidate) => candidate.id === targetId);
      if (target) {
        setSelectedEntity(target);
        setInspectedEntity(undefined);
        onSelectEntity?.(target);
      }
    },
    [investigationTargets, onSelectEntity]
  );

  /** Opens a related entity in the dossier without replacing graph focus. */
  const inspectRelated = useCallback(
    (related: RelatedEntity) => {
      if (
        related.kind !== EntityType.user &&
        related.kind !== EntityType.host &&
        related.kind !== EntityType.service
      ) {
        return;
      }
      const known = resolveExplorerEntity(related, selectedEntity, entities);
      setInspectedEntity(
        known ?? {
          id: related.name,
          name: related.name,
          type: related.kind,
          identifierValue: related.name,
          riskScoreNorm: undefined,
          riskLevel: getRiskLevelFromScore(undefined),
          criticality: undefined,
          source: undefined,
          lastSeen: undefined,
        }
      );
    },
    [entities, selectedEntity]
  );

  /** Graph → Agent Builder: open a hunt chat scoped to a related entity. */
  const huntRelated = useCallback(
    (related: RelatedEntity) => {
      agentBuilder?.openChat({
        newConversation: true,
        initialMessage: `Investigate the ${related.kind} "${related.name}". Look for recent alerts, anomalies, and unusual behavior involving this entity, and summarize any threats found.`,
        autoSendInitialMessage: false,
        sessionTag: 'security',
      });
    },
    [agentBuilder]
  );

  /** Timeline → graph: pulse the node matching the hovered step's entity. */
  const highlightEntity = useCallback((ref: TimelineEntityRef | undefined) => {
    setHighlightedNodeKey(ref ? entityRefKey(ref) : undefined);
  }, []);

  /** Timeline → graph: focus/select the node for a step's entity on click. */
  const focusEntity = useCallback((ref: TimelineEntityRef) => {
    const key = entityRefKey(ref);
    setHighlightedNodeKey(key);
    setFocusRequest({ key, nonce: Date.now() });
  }, []);

  /** Opens the shared AI explain flyout with a fully-assembled prompt. */
  const openExplain = useCallback(
    (prompt: string, subtitle: string) => {
      setExplainSubtitle(subtitle);
      setExplainPrompt(prompt);
      setExplainOpen(true);
      explain(prompt);
    },
    [explain]
  );

  /** Re-runs the last explain prompt (regenerate / retry from the flyout). */
  const regenerateExplain = useCallback(() => {
    if (explainPrompt) explain(explainPrompt);
  }, [explain, explainPrompt]);

  // Clear any AI explanation when the focus entity changes so a stale summary
  // never lingers over a different cluster.
  useEffect(() => {
    resetExplain();
    setExplainOpen(false);
  }, [selectedEntity?.id, resetExplain]);

  const normalizeKind = useCallback(
    (kind: string | undefined): EntityType.user | EntityType.host | EntityType.service => {
      if (kind === EntityType.host) return EntityType.host;
      if (kind === EntityType.service) return EntityType.service;
      return EntityType.user;
    },
    []
  );

  /** AI explain → graph: focus/select the node for a referenced entity. */
  const explainFocusEntity = useCallback(
    (ref: ExplainEntityRef) => {
      focusEntity({ kind: normalizeKind(ref.kind), name: ref.name });
    },
    [focusEntity, normalizeKind]
  );

  /** AI explain → graph: pulse the node for a hovered referenced entity. */
  const explainHighlightEntity = useCallback(
    (ref: ExplainEntityRef | undefined) => {
      highlightEntity(ref ? { kind: normalizeKind(ref.kind), name: ref.name } : undefined);
    },
    [highlightEntity, normalizeKind]
  );

  /** AI explain: run a real action (hunt / alerts pivot / focus). */
  const runExplainAction = useCallback(
    (action: ExplainAction) => {
      if (action.action === 'focus' && action.targetName) {
        explainFocusEntity({ name: action.targetName, kind: action.targetKind });
      } else if (action.action === 'hunt' && action.targetName) {
        agentBuilder?.openChat({
          newConversation: true,
          initialMessage: `Investigate the ${action.targetKind ?? 'entity'} "${
            action.targetName
          }". Look for recent alerts, anomalies, and unusual behavior involving this entity, and summarize any threats found.`,
          autoSendInitialMessage: false,
          sessionTag: 'security',
        });
      } else if (action.action === 'alerts') {
        if (action.targetTechnique) {
          navigateToAlertsPageWithFilters({
            title: action.targetTechnique,
            selected_options: [action.targetTechnique],
            field_name: 'kibana.alert.rule.threat.technique.id',
          });
        } else if (action.targetName) {
          const fieldName =
            action.targetKind === EntityType.host
              ? 'host.name'
              : action.targetKind === EntityType.service
              ? 'service.name'
              : 'user.name';
          navigateToAlertsPageWithFilters({
            title: action.targetName,
            selected_options: [action.targetName],
            field_name: fieldName,
          });
        }
      }
    },
    [agentBuilder, explainFocusEntity, navigateToAlertsPageWithFilters]
  );

  /** AI explain → graph: click a progression step to focus a referenced entity. */
  const explainStepClick = useCallback(
    (step: ExplainChainStep) => {
      const haystack = `${step.label} ${step.evidence ?? ''}`.toLowerCase();
      const match = (explainResult?.entities ?? []).find((candidate) =>
        haystack.includes(candidate.name.toLowerCase())
      );
      if (match) explainFocusEntity({ name: match.name, kind: match.kind });
    },
    [explainFocusEntity, explainResult]
  );

  const layoutStyle = css`
    position: relative;
    min-height: 720px;
    height: max(720px, calc(100vh - 230px));
    overflow: hidden;
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  const leftRailStyle = css`
    position: absolute;
    z-index: 10;
    top: ${euiTheme.size.m};
    bottom: ${euiTheme.size.m};
    left: ${euiTheme.size.m};
    width: 288px;
    display: flex;
    flex-direction: column;
    box-shadow: ${euiTheme.shadows.l};
    animation: rail-enter 180ms ease-out both;

    @keyframes rail-enter {
      from {
        opacity: 0;
        transform: translateX(-12px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;

  const showTimeline = !!selectedEntity && isTimelineOpen;
  const { timelineWidth, dossierWidth, dossierRight, reservedRight } = computeRightPanelLayout({
    showTimeline,
    isTimelineExpanded,
    showDossier: !!inspectedEntity,
    gap: euiTheme.size.s,
  });
  const dossierRightOffset = dossierRight;
  const centerStyle = css`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: ${reservedRight};
    transition: right ${euiTheme.animation.normal} ease;

    @media (max-width: 899px) {
      right: 0;
      bottom: ${showTimeline || inspectedEntity ? '50%' : '0'};
    }
  `;

  const timelineColumnStyle = css`
    position: absolute;
    z-index: 11;
    top: ${euiTheme.size.m};
    right: ${euiTheme.size.m};
    bottom: ${euiTheme.size.m};
    width: calc(${timelineWidth} - ${euiTheme.size.m});
    display: flex;
    flex-direction: column;
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
    box-shadow: ${euiTheme.shadows.l};
    overflow: hidden;
    transition: width ${euiTheme.animation.normal} ease;
    animation: timeline-enter ${euiTheme.animation.normal} ease-out both;

    @keyframes timeline-enter {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }

    @media (max-width: 899px) {
      top: auto;
      left: ${euiTheme.size.s};
      right: ${euiTheme.size.s};
      bottom: ${euiTheme.size.s};
      height: calc(50% - ${euiTheme.size.m});
      width: auto;
    }
  `;

  const timelineToggleStyle = css`
    position: absolute;
    z-index: 9;
    top: ${euiTheme.size.m};
    right: ${euiTheme.size.m};
    box-shadow: ${euiTheme.shadows.s};
  `;

  const rightRailStyle = css`
    position: absolute;
    z-index: 12;
    top: ${euiTheme.size.m};
    right: ${dossierRightOffset};
    bottom: ${euiTheme.size.m};
    width: ${dossierWidth};
    overflow-y: auto;
    box-shadow: ${euiTheme.shadows.xl};
    transition: right ${euiTheme.animation.normal} ease;

    @media (max-width: 899px) {
      top: 35%;
      left: ${euiTheme.size.s};
      right: ${euiTheme.size.s};
      bottom: ${euiTheme.size.s};
      width: auto;
      z-index: 14;
    }
  `;

  const railToggleStyle = css`
    position: absolute;
    z-index: 9;
    top: ${euiTheme.size.m};
    left: ${euiTheme.size.m};
    box-shadow: ${euiTheme.shadows.s};
  `;

  const listStyle = css`
    margin-top: ${euiTheme.size.s};
    overflow-y: auto;
    max-height: 560px;
  `;

  const entityRowStyle = (isSelected: boolean) => css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    width: 100%;
    padding: ${euiTheme.size.s};
    border: none;
    border-radius: ${euiTheme.border.radius.small};
    background: ${isSelected ? transparentize(euiTheme.colors.primary, 0.1) : 'transparent'};
    cursor: pointer;
    text-align: left;
    transition: background-color ${euiTheme.animation.fast} ease;

    &:hover {
      background: ${transparentize(euiTheme.colors.primary, 0.06)};
    }
  `;

  const entityNameStyle = css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textParagraph};
  `;

  const openEntityRailLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.openEntityRail',
    { defaultMessage: 'Open ranked entities' }
  );
  const closeEntityRailLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.closeEntityRail',
    { defaultMessage: 'Close ranked entities' }
  );
  const openTimelineLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.openTimeline',
    { defaultMessage: 'Open causal timeline' }
  );
  const closeDetailsLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.closeDetails',
    { defaultMessage: 'Close entity details' }
  );

  return (
    <div css={layoutStyle} data-test-subj="entityIntelligenceExplorerTab">
      {!isEntityRailOpen ? (
        <div css={railToggleStyle}>
          <EuiToolTip disableScreenReaderOutput content={openEntityRailLabel}>
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="listBullet"
              aria-label={openEntityRailLabel}
              onClick={() => setIsEntityRailOpen(true)}
              data-test-subj="entityIntelligenceOpenEntityRail"
            />
          </EuiToolTip>
        </div>
      ) : null}

      {isEntityRailOpen ? (
        <div css={[leftRailStyle, staggeredEntrance(0)]}>
          <IntelligencePanel grow>
            <div
              css={css`
                display: flex;
                align-items: center;
                justify-content: space-between;
              `}
            >
              <SectionLabel>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.entitiesTitle',
                  { defaultMessage: 'Ranked entities' }
                )}
              </SectionLabel>
              <EuiToolTip disableScreenReaderOutput content={closeEntityRailLabel}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={closeEntityRailLabel}
                  onClick={() => setIsEntityRailOpen(false)}
                />
              </EuiToolTip>
            </div>
            <EuiSpacer size="s" />
            <EuiButtonGroup
              legend={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.typeFilterLegend',
                { defaultMessage: 'Filter by entity type' }
              )}
              options={TYPE_FILTER_OPTIONS}
              idSelected={typeFilter}
              onChange={(id) => setTypeFilter(id as TypeFilter)}
              buttonSize="compressed"
              isFullWidth
            />
            <EuiSpacer size="s" />
            <EuiFieldSearch
              placeholder={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.searchPlaceholder',
                { defaultMessage: 'Search entities' }
              )}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              compressed
              fullWidth
              data-test-subj="entityIntelligenceExplorerSearch"
            />
            <div css={listStyle}>
              {isLoading ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiSkeletonText lines={6} />
                </>
              ) : entities.length === 0 ? (
                <PanelEmptyState
                  iconType="search"
                  message={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.noEntities',
                    { defaultMessage: 'No entities match the current filters.' }
                  )}
                />
              ) : (
                entities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    css={entityRowStyle(selectedEntity?.id === entity.id)}
                    onClick={() => {
                      setSelectedEntity(entity);
                      setInspectedEntity(undefined);
                      setIsEntityRailOpen(false);
                      onSelectEntity?.(entity);
                    }}
                    data-test-subj={`entityIntelligenceExplorerEntity-${entity.name}`}
                  >
                    <EuiIcon
                      type={EntityIconByType[entity.type]}
                      size="m"
                      color="subdued"
                      aria-hidden={true}
                    />
                    <span css={entityNameStyle} title={entity.name}>
                      {entity.name}
                    </span>
                    <RiskLevelBadge level={entity.riskLevel} score={entity.riskScoreNorm} />
                  </button>
                ))
              )}
            </div>
          </IntelligencePanel>
        </div>
      ) : null}

      <div css={centerStyle}>
        {selectedEntity ? (
          <EntityInvestigationCanvas
            key={selectedEntity.id}
            entity={selectedEntity}
            entityTargets={investigationTargets}
            onInvestigateEntity={investigateSecurityEntity}
          >
            {(security) => (
              <RelationshipGraph
                entity={selectedEntity}
                security={security}
                onInspectEntity={(related) => {
                  inspectRelated(related);
                }}
                onHuntEntity={huntRelated}
                onEvidenceOpen={() => setInspectedEntity(undefined)}
                onTimeRangeChange={setGraphTimeRange}
                highlightedNodeKey={highlightedNodeKey}
                onNodeHighlight={setHighlightedNodeKey}
                focusNodeRequest={focusRequest}
                agentActivityRequest={agentActivityRequest}
                onExplain={openExplain}
                isExternalDrawerOpen={inspectedEntity !== undefined}
              />
            )}
          </EntityInvestigationCanvas>
        ) : (
          <div
            css={css`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              gap: ${euiTheme.size.m};
            `}
          >
            <EuiIcon type="branch" size="xxl" color="subdued" aria-hidden={true} />
            <EuiText size="s" color="subdued">
              <p>
                {entityId
                  ? requestedEntity.isLoading
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.explorer.loadingRequestedEntity',
                        { defaultMessage: 'Loading the requested identity…' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.explorer.requestedEntityUnavailable',
                        {
                          defaultMessage:
                            'This identity is unavailable in the current space. Check access or select another identity.',
                        }
                      )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.explorer.selectEntityPrompt',
                      { defaultMessage: 'Select an entity to explore its relationships' }
                    )}
              </p>
            </EuiText>
          </div>
        )}
      </div>

      {selectedEntity && !isTimelineOpen ? (
        <div css={timelineToggleStyle}>
          <EuiToolTip disableScreenReaderOutput content={openTimelineLabel}>
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="timeline"
              aria-label={openTimelineLabel}
              onClick={() => setIsTimelineOpen(true)}
              data-test-subj="entityIntelligenceOpenTimeline"
            />
          </EuiToolTip>
        </div>
      ) : null}

      {showTimeline && selectedEntity ? (
        <div css={timelineColumnStyle} key={`timeline-${selectedEntity.id}`}>
          <EntityTimelinePanel
            entity={selectedEntity}
            timeRange={graphTimeRange}
            onClose={() => setIsTimelineOpen(false)}
            isExpanded={isTimelineExpanded}
            onToggleExpanded={() => setIsTimelineExpanded((current) => !current)}
            onHighlightEntity={highlightEntity}
            onFocusEntity={focusEntity}
            onExplain={openExplain}
            highlightedEntityKey={highlightedNodeKey}
          />
        </div>
      ) : null}

      {inspectedEntity ? (
        <div css={rightRailStyle} key={`dossier-${inspectedEntity.id}`}>
          <div
            css={css`
              position: absolute;
              z-index: 2;
              top: ${euiTheme.size.s};
              right: ${euiTheme.size.s};
            `}
          >
            <EuiToolTip disableScreenReaderOutput content={closeDetailsLabel}>
              <EuiButtonIcon
                display="base"
                iconType="cross"
                aria-label={closeDetailsLabel}
                onClick={() => setInspectedEntity(undefined)}
              />
            </EuiToolTip>
          </div>
          <EntityDossierPanel
            entity={inspectedEntity}
            compact
            onShowAgentActivity={() => {
              if (selectedEntity?.id !== inspectedEntity.id) {
                setSelectedEntity(inspectedEntity);
                onSelectEntity?.(inspectedEntity);
              }
              setInspectedEntity(undefined);
              setIsTimelineOpen(false);
              setAgentActivityRequest({ entityId: inspectedEntity.id, nonce: Date.now() });
            }}
          />
        </div>
      ) : null}

      {explainOpen ? (
        <AiExplainFlyout
          subtitle={explainSubtitle}
          onClose={() => setExplainOpen(false)}
          result={explainResult}
          rawResult={explainRaw}
          isGenerating={isExplaining}
          error={explainError}
          hasConnector={hasExplainConnector}
          connectorName={explainConnectorName}
          onGenerate={regenerateExplain}
          hasRequested
          onEntityClick={explainFocusEntity}
          onEntityHover={explainHighlightEntity}
          onStepClick={explainStepClick}
          onAction={runExplainAction}
        />
      ) : null}
    </div>
  );
};
