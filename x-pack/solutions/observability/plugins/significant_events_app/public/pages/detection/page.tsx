/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import {
  type Detection,
  type SignificantEventResponse,
  type Feature,
  type QueryWithOccurrences,
} from '@kbn/significant-events-schema';
import { WorkspacePage } from '../../components/workspace_page';
import { SignificantEventsSearchBar } from '../../components/search_bar';
import { KnowledgeIndicatorDetailsFlyout } from '../../components/knowledge_indicators/knowledge_indicator_details_flyout';
import { useFetchSignificantEventLifecycle } from '../../hooks/use_fetch_significant_event_lifecycle';
import { useKibana } from '../../hooks/use_kibana';
import { useMaintenanceStatus } from '../../hooks/use_significant_events_maintenance';
import { buildDetectionModel, hasRuleCoverage, type DetectionEntity } from './model';
import { MetricValue } from './metric_value';
import { RuleCoverage } from './rule_coverage';
import { EngineDrawer, engineDrawerLabels, type EngineDrawerTab } from './engine_drawer';
import { RulesWorkspace } from './rules_workspace';
import { useEngineActivity } from './use_engine_activity';
import { EngineActivityPanel } from './engine_activity_panel';
import { journey } from './journey_translations';
import { DetectionEventsFeed } from './events_feed';
import { SignificantEventFlyout } from '../significant_events/components/significant_events_tab/significant_event_flyout';
import { DetectionFlyout } from '../significant_events/components/detections_tab/detection_flyout';
import { DetectionTopology } from './topology';
import { DetectionTimeline } from './timeline';
import { useDetectionData } from './use_detection_data';
import { labels } from './translations';

const number = (value: number): string => value.toLocaleString(i18n.getLocale());
const date = (value?: string): string =>
  value
    ? new Date(value).toLocaleString(i18n.getLocale(), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : labels.noData;

export const DetectionPage = (): React.ReactElement => (
  <WorkspacePage>
    <DetectionWorkspace />
  </WorkspacePage>
);

const DetectionWorkspace = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const {
    core: { application },
    dependencies: {
      start: { data: dataPlugin },
    },
  } = useKibana();
  const history = useHistory();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  useEffect(() => {
    if (params.get('view') !== 'knowledge') return;
    const next = new URLSearchParams(params);
    next.delete('view');
    next.delete('coverage');
    void application.navigateToUrl(
      application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, { path: `/knowledge?${next.toString()}` })
    );
  }, [params, application]);
  const rangeFrom = params.get('rangeFrom') || 'now-24h';
  const rangeTo = params.get('rangeTo') || 'now';
  const selectedId = params.get('entity') || undefined;
  const showCoverageGaps = params.get('coverage') === 'uncovered';
  const requestedView = params.get('view') || 'overview';
  const view =
    requestedView === 'services'
      ? 'rules'
      : ['overview', 'rules', 'timeline', 'events'].includes(requestedView)
      ? requestedView
      : 'overview';
  const drawerParam = params.get('engine');
  const engineTab: EngineDrawerTab | undefined =
    drawerParam === 'activity' || drawerParam === 'streams' ? drawerParam : undefined;
  useEffect(() => {
    if (requestedView !== 'activity' && requestedView !== 'streams') return;
    const next = new URLSearchParams(history.location.search);
    next.set('engine', requestedView);
    next.delete('view');
    history.replace({ ...history.location, search: next.toString() });
  }, [history, requestedView]);
  const [search, setSearch] = useState('');
  const [openedEvent, setOpenedEvent] = useState<SignificantEventResponse>();
  const [openedDetection, setOpenedDetection] = useState<Detection>();
  const [inspected, setInspected] = useState<KnowledgeIndicator>();
  const linkedEvent = useFetchSignificantEventLifecycle(params.get('eventId') || undefined);
  const query = useDetectionData(rangeFrom, rangeTo);
  const engineActivity = useEngineActivity();
  const maintenance = useMaintenanceStatus();
  const { data, refetch } = query;

  const updateParam = useCallback(
    (key: string, value?: string) => {
      const next = new URLSearchParams(history.location.search);
      if (value) next.set(key, value);
      else next.delete(key);
      history.replace({ ...history.location, search: next.toString() });
    },
    [history]
  );
  const refresh = useCallback(() => {
    void query.refetch();
    void maintenance.refetch();
  }, [query, maintenance]);
  useEffect(() => {
    const subscription = dataPlugin.query.timefilter.timefilter.getFetch$().subscribe(() => {
      void refetch();
    });
    return () => subscription.unsubscribe();
  }, [dataPlugin, refetch]);

  const model = useMemo(
    () =>
      buildDetectionModel(
        data?.features.features ?? [],
        data?.queries.queries ?? [],
        data?.detections.hits ?? [],
        data?.events.hits ?? []
      ),
    [data]
  );
  useEffect(() => {
    const featureId = params.get('knowledgeId');
    const ruleId = params.get('ruleId');
    const streamName = params.get('stream');
    const feature = data?.features.features.find(
      (item) =>
        (item.id === featureId || item.uuid === featureId) &&
        (!streamName || item.stream_name === streamName)
    );
    const rule = data?.queries.queries.find(
      (item) => item.id === ruleId || item.rule_uuid === ruleId
    );
    if (feature) setInspected({ kind: 'feature', feature });
    else if (rule)
      setInspected({
        kind: 'query',
        query: rule,
        stream_name: rule.stream_name,
        rule: { backed: rule.rule_backed, id: rule.id },
      });
  }, [data, params]);
  useEffect(() => {
    const event = linkedEvent.data?.events.at(-1);
    if (event) setOpenedEvent(event);
  }, [linkedEvent.data]);
  const selected = model.entities.find((entity) => entity.id === selectedId);
  const visibleEntities = model.entities.filter(
    (entity) =>
      (!showCoverageGaps || !hasRuleCoverage(entity)) &&
      `${entity.label} ${entity.name} ${entity.namespace}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );
  const coveredServices = model.entities.filter(hasRuleCoverage).length;
  const gapEntities = model.entities.filter((entity) => !hasRuleCoverage(entity));
  const topologyModel = showCoverageGaps
    ? {
        ...model,
        entities: gapEntities,
        relationships: model.relationships.filter(
          (edge) =>
            gapEntities.some((entity) => entity.id === edge.source) &&
            gapEntities.some((entity) => entity.id === edge.target)
        ),
      }
    : model;
  const scopeQueries = selected?.queries ?? data?.queries.queries ?? [];
  const scopeDetections = selected?.detections ?? data?.detections.hits ?? [];
  const scopeEvents = selected?.events ?? data?.events.hits ?? [];
  const occurrences = useMemo(
    () =>
      Object.fromEntries(
        (data?.queries.queries ?? []).map((rule) => [
          rule.id,
          rule.occurrences.map((occurrence) => ({
            x: new Date(occurrence.date).getTime(),
            y: occurrence.count,
          })),
        ])
      ),
    [data]
  );
  const inspectFeature = (feature: Feature) => setInspected({ kind: 'feature', feature });
  const inspectRule = (rule: QueryWithOccurrences) =>
    setInspected({
      kind: 'query',
      query: rule,
      stream_name: rule.stream_name,
      rule: { backed: rule.rule_backed, id: rule.id },
    });
  const listHref = (tab: string, extra?: Record<string, string>): string =>
    application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
      path: `/${tab}?${new URLSearchParams({ rangeFrom, rangeTo, ...extra })}`,
    });
  const panelCss = css`
    border: 1px solid ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.panel};
  `;

  if (!data && query.isLoading)
    return (
      <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<h2>{labels.loading}</h2>} />
    );
  if (!data)
    return (
      <EuiEmptyPrompt
        iconType="warning"
        title={<h2>{labels.loadError}</h2>}
        body={<p>{query.error instanceof Error ? query.error.message : labels.loadError}</p>}
        actions={
          <EuiButton
            data-test-subj="significantEventsAppDetectionWorkspaceButton"
            onClick={refresh}
          >
            {labels.retry}
          </EuiButton>
        }
      />
    );

  const truncated =
    data.queries.total > data.queries.queries.length ||
    data.detections.total > data.detections.hits.length ||
    data.events.total > data.events.hits.length ||
    data.activity.total > data.activity.activities.length;
  const totals = [
    {
      label: labels.entities,
      value: model.entities.length,
      hint: labels.entitiesHint,
      icon: 'graphApp',
    },
    {
      label: labels.knowledge,
      value: data.features.features.filter(
        (feature) =>
          !feature.excluded && (!feature.expires_at || Date.parse(feature.expires_at) > Date.now())
      ).length,
      hint: labels.knowledgeHint,
      icon: 'documents',
    },
    {
      label: labels.rules,
      value: data.queries.queries.filter((rule) => rule.rule_backed).length,
      hint: labels.rulesHint,
      icon: 'bolt',
    },
    {
      label: labels.detections,
      value: data.detections.total,
      hint: labels.detectionsHint,
      icon: 'visLine',
    },
    { label: labels.events, value: data.events.total, hint: labels.eventsHint, icon: 'bell' },
  ];
  const viewTabs = [
    { id: 'overview', label: labels.overview },
    { id: 'rules', label: labels.browseRules },
    { id: 'timeline', label: labels.browseTimeline },
    { id: 'events', label: labels.browseEvents },
  ];

  const viewNavigation = (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiTabs size="s">
            {viewTabs.map((tab) => (
              <EuiTab
                key={tab.id}
                isSelected={view === tab.id}
                onClick={() => updateParam('view', tab.id)}
              >
                {tab.label}
              </EuiTab>
            ))}
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem
              grow={false}
              css={css`
                min-width: 300px;
              `}
            >
              <SignificantEventsSearchBar showDatePicker enableDateRangePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );

  return (
    <div
      data-test-subj="detectionWorkspace"
      css={css`
        max-width: 1600px;
        width: 100%;
        margin: 0 auto;
        padding-bottom: ${euiTheme.size.xxl};
      `}
    >
      {query.isError && (
        <>
          <EuiCallOut announceOnMount color="warning" title={labels.loadError}>
            <p>{query.error instanceof Error ? query.error.message : labels.loadError}</p>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppDetectionWorkspaceButton"
              onClick={refresh}
            >
              {labels.retry}
            </EuiButtonEmpty>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {truncated && (
        <>
          <EuiCallOut announceOnMount color="warning" title={labels.partial} />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiPanel hasBorder hasShadow={false} paddingSize="s">
        <EngineActivityPanel
          onOpenActivity={() => updateParam('engine', 'activity')}
          headerAction={
            <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.significantEventsApp.engineBar.watchedStreams', {
                    defaultMessage: '{count} watched streams',
                    values: {
                      count: engineActivity.data
                        ? number(
                            engineActivity.data.streams.filter((stream) => stream.watched).length
                          )
                        : '—',
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="inspect"
                  aria-haspopup="dialog"
                  aria-expanded={Boolean(engineTab)}
                  onClick={() => updateParam('engine', 'activity')}
                  data-test-subj="detectionOpenEngineDrawer"
                >
                  {engineDrawerLabels.title}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiPanel>

      <div
        css={css`
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: ${euiTheme.size.m};
          padding: ${euiTheme.size.s};
          margin-top: ${euiTheme.size.xs};
        `}
      >
        {totals.map((metric) => (
          <EuiToolTip key={metric.label} content={metric.hint}>
            <span
              tabIndex={0}
              css={css`
                display: inline-flex;
                align-items: baseline;
                gap: ${euiTheme.size.s};
              `}
            >
              <MetricValue
                key={`${rangeFrom}:${rangeTo}:${metric.label}`}
                metric={metric.label}
                range={`${rangeFrom}:${rangeTo}`}
                value={metric.value}
              />

              <span
                css={css`
                  font-size: ${euiTheme.font.scale.xs}rem;
                  color: ${euiTheme.colors.textSubdued};
                `}
              >
                {metric.label}
              </span>
            </span>
          </EuiToolTip>
        ))}
        <RuleCoverage
          covered={coveredServices}
          total={model.entities.length}
          partial={data.queries.total > data.queries.queries.length}
          showGaps={showCoverageGaps}
          onToggleGaps={() => {
            updateParam('coverage', showCoverageGaps ? undefined : 'uncovered');
            updateParam('entity');
            updateParam('view', 'overview');
          }}
        />
        <EuiToolTip
          content={`${labels.updated} ${date(new Date(query.dataUpdatedAt).toISOString())}`}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj="detectionWorkspaceRefresh"
            size="s"
            iconType="refresh"
            aria-label={labels.refresh}
            onClick={refresh}
            isLoading={query.isFetching}
          />
        </EuiToolTip>
      </div>
      <EuiSpacer size="m" />
      {model.entities.length === 0 && view === 'overview' ? (
        <>
          {viewNavigation}
          <EuiEmptyPrompt
            iconType="graphApp"
            title={<h2>{labels.emptyTitle}</h2>}
            body={<p>{labels.emptyBody}</p>}
            actions={
              <EuiButton
                data-test-subj="significantEventsAppDetectionWorkspaceButton"
                onClick={() => updateParam('engine', 'streams')}
                fill
              >
                {journey.configureStreams}
              </EuiButton>
            }
          />
        </>
      ) : (
        <>
          <div
            css={css`
              display: grid;
              grid-template-columns: 220px minmax(0, 1fr);
              gap: ${euiTheme.size.l};
              align-items: start;
              @media (max-width: 900px) {
                grid-template-columns: 1fr;
              }
            `}
          >
            <EuiPanel paddingSize="m" hasShadow={false} css={panelCss}>
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                  margin-bottom: ${euiTheme.size.m};
                `}
              >
                <p>
                  {showCoverageGaps
                    ? i18n.translate('xpack.significantEventsApp.ruleCoverage.uncoveredServices', {
                        defaultMessage: 'Services without rules',
                      })
                    : labels.services}{' '}
                  · {number(showCoverageGaps ? gapEntities.length : model.entities.length)}
                </p>
              </EuiText>
              <EuiFieldSearch
                data-test-subj="significantEventsAppDetectionWorkspaceFieldSearch"
                compressed
                fullWidth
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={labels.search}
                aria-label={labels.search}
              />
              <EuiSpacer size="m" />
              <button
                type="button"
                aria-pressed={!selectedId}
                onClick={() => updateParam('entity')}
                css={css`
                  width: 100%;
                  text-align: left;
                  padding: ${euiTheme.size.s};
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${!selectedId
                    ? `color-mix(in srgb, ${euiTheme.colors.primary} 10%, transparent)`
                    : 'transparent'};
                  color: ${!selectedId ? euiTheme.colors.primary : euiTheme.colors.text};
                  font-size: ${euiTheme.font.scale.s}rem;
                  font-weight: ${euiTheme.font.weight.semiBold};
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                  }
                `}
              >
                <EuiIcon type="graphApp" aria-hidden={true} /> {labels.allServices}
              </button>
              <EuiHorizontalRule margin="s" />
              <div
                css={css`
                  max-height: 620px;
                  overflow-y: auto;
                `}
              >
                {visibleEntities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    aria-pressed={entity.id === selectedId}
                    onClick={() => updateParam('entity', entity.id)}
                    data-test-subj="detectionServiceButton"
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: ${euiTheme.size.s};
                      width: 100%;
                      text-align: left;
                      padding: ${euiTheme.size.s};
                      margin-bottom: ${euiTheme.size.xs};
                      border-radius: ${euiTheme.border.radius.medium};
                      color: ${euiTheme.colors.text};
                      background: ${entity.id === selectedId
                        ? `color-mix(in srgb, ${euiTheme.colors.primary} 10%, transparent)`
                        : 'transparent'};
                      &:hover {
                        background: ${euiTheme.colors.backgroundBaseSubdued};
                      }
                      &:focus-visible {
                        outline: 2px solid ${euiTheme.colors.primary};
                      }
                    `}
                  >
                    <EuiIcon
                      type={
                        entity.subtype === 'database'
                          ? 'database'
                          : entity.subtype === 'message_queue'
                          ? 'boxesVertical'
                          : 'apps'
                      }
                      color={
                        entity.events.some((event) => event.status === 'open')
                          ? 'danger'
                          : entity.queries.some((rule) => rule.rule_backed)
                          ? 'primary'
                          : 'subdued'
                      }
                      aria-hidden={true}
                    />
                    <span
                      css={css`
                        min-width: 0;
                        flex: 1;
                      `}
                    >
                      <span
                        css={css`
                          display: block;
                          font-size: ${euiTheme.font.scale.s}rem;
                          font-weight: ${euiTheme.font.weight.medium};
                          overflow-wrap: anywhere;
                        `}
                      >
                        {entity.label}
                      </span>
                      <span
                        css={css`
                          font-size: ${euiTheme.font.scale.xs}rem;
                          color: ${euiTheme.colors.textSubdued};
                        `}
                      >
                        {entity.namespace || entity.subtype.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span
                      css={css`
                        font-size: ${euiTheme.font.scale.xs}rem;
                        color: ${euiTheme.colors.textSubdued};
                      `}
                    >
                      {entity.queries.filter((rule) => rule.rule_backed).length}
                    </span>
                  </button>
                ))}
                {visibleEntities.length === 0 && (
                  <EuiText size="xs" color="subdued">
                    <p>{labels.emptyServices}</p>
                  </EuiText>
                )}
              </div>
            </EuiPanel>

            <div
              css={css`
                min-width: 0;
              `}
            >
              {viewNavigation}
              {selected && (
                <>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem>
                      <EuiTitle size="s">
                        <h2>{selected.label}</h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj="significantEventsAppDetectionWorkspaceButton"
                        size="xs"
                        iconType="cross"
                        onClick={() => updateParam('entity')}
                      >
                        {labels.showAll}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                </>
              )}
              {view === 'overview' && (
                <>
                  <div
                    css={css`
                      display: grid;
                      grid-template-columns: ${selected
                        ? 'minmax(0, 1fr) 300px'
                        : 'minmax(0, 1fr)'};
                      gap: ${euiTheme.size.m};
                      align-items: start;
                      @media (max-width: 1250px) {
                        grid-template-columns: 1fr;
                      }
                    `}
                  >
                    <div>
                      <DetectionTopology
                        model={topologyModel}
                        selectedId={selected?.id}
                        onSelect={(id) => updateParam('entity', id)}
                        onInspectFeature={inspectFeature}
                      />
                    </div>
                    {selected && (
                      <ServiceInspector
                        entity={selected}
                        modelEntities={model.entities}
                        onSelect={(id) => updateParam('entity', id)}
                        onInspectFeature={inspectFeature}
                      />
                    )}
                  </div>
                  {(model.unresolvedRelationships > 0 || model.unassignedRules > 0) && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs" color="subdued">
                        {model.unresolvedRelationships > 0 && <p>{labels.unresolved}</p>}
                        {model.unassignedRules > 0 && <p>{labels.unassigned}</p>}
                      </EuiText>
                    </>
                  )}
                  <EuiSpacer size="l" />
                </>
              )}

              {view === 'timeline' && (
                <>
                  <DetectionTimeline
                    entities={selected ? [selected] : model.entities}
                    start={data.start}
                    end={data.end}
                    onInspectFeature={inspectFeature}
                    onInspectRule={inspectRule}
                    onOpenEvent={setOpenedEvent}
                    onOpenDetection={setOpenedDetection}
                    activity={data.activity.activities}
                    queries={scopeQueries}
                    features={data.features.features}
                    detections={scopeDetections}
                    events={scopeEvents}
                    selectedStreams={selected?.streams}
                  />
                  <EuiSpacer size="l" />
                </>
              )}

              {view === 'rules' && (
                <RulesWorkspace
                  entities={model.entities}
                  selected={selected}
                  queries={data.queries.queries}
                  start={data.start}
                  end={data.end}
                  onInspect={inspectRule}
                  onSelectService={(id) => updateParam('entity', id)}
                  allRulesHref={listHref('queries')}
                />
              )}

              {view === 'events' && (
                <DetectionEventsFeed
                  detections={scopeDetections}
                  events={scopeEvents}
                  onOpenDetection={setOpenedDetection}
                  onOpenEvent={setOpenedEvent}
                />
              )}
            </div>
          </div>
        </>
      )}
      {engineTab && (
        <EngineDrawer
          tab={engineTab}
          onSelectTab={(tab) => updateParam('engine', tab)}
          onClose={() => updateParam('engine')}
        />
      )}
      {openedEvent && (
        <SignificantEventFlyout
          event={openedEvent}
          onClose={() => {
            setOpenedEvent(undefined);
            updateParam('eventId');
          }}
        />
      )}
      {openedDetection && (
        <DetectionFlyout
          detection={openedDetection}
          onClose={() => setOpenedDetection(undefined)}
        />
      )}
      {inspected && (
        <KnowledgeIndicatorDetailsFlyout
          knowledgeIndicator={inspected}
          features={data.features.features}
          occurrencesByQueryId={occurrences}
          onClose={() => {
            setInspected(undefined);
            updateParam('knowledgeId');
            updateParam('ruleId');
          }}
        />
      )}
    </div>
  );
};

const ServiceInspector = ({
  entity,
  modelEntities,
  onSelect,
  onInspectFeature,
}: {
  entity: DetectionEntity;
  modelEntities: DetectionEntity[];
  onSelect: (id: string) => void;
  onInspectFeature: (feature: Feature) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const contextId = useGeneratedHtmlId({ prefix: 'serviceContext' });
  const { core } = useKibana();
  const location = useLocation();
  const range = new URLSearchParams(location.search);
  const serviceFeature = entity.features.find(
    (feature) => feature.type === 'entity' && typeof feature.properties.name === 'string'
  );
  const apmServiceName =
    typeof serviceFeature?.properties.name === 'string'
      ? serviceFeature.properties.name
      : entity.name;
  const apmParams = new URLSearchParams({
    rangeFrom: range.get('rangeFrom') || 'now-24h',
    rangeTo: range.get('rangeTo') || 'now',
    environment: entity.environment || 'ENVIRONMENT_ALL',
  });
  const active = entity.queries.filter((rule) => rule.rule_backed).length;
  const latest = entity.features
    .map((feature) => feature.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const infrastructure = entity.features.filter((feature) => feature.type === 'infrastructure');
  const known = entity.features.filter(
    (feature) =>
      ![
        'dataset_analysis',
        'log_samples',
        'log_patterns',
        'error_logs',
        'infrastructure',
        'dependency',
      ].includes(feature.type)
  );
  return (
    <EuiPanel
      paddingSize="m"
      hasBorder
      hasShadow={false}
      data-test-subj="detectionServiceInspector"
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.significantEventsApp.serviceInspector.context', {
                defaultMessage: 'Service context',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={journey.openApm} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="significantEventsAppServiceInspectorButton"
              size="s"
              iconType="apmApp"
              aria-label={journey.openApm}
              href={core.application.getUrlForApp('apm', {
                path: `/services/${encodeURIComponent(apmServiceName)}/overview?${apmParams}`,
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {entity.namespace || entity.name}
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiText size="xs" color="subdued">
        <p>{labels.coverage}</p>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiHealth color={active ? euiTheme.colors.primary : euiTheme.colors.mediumShade}>
        {active ? `${number(active)} ${labels.covered}` : labels.uncovered}
      </EuiHealth>
      <EuiHorizontalRule margin="m" />
      <EuiText size="xs" color="subdued">
        <p>{labels.learned}</p>
      </EuiText>
      <EuiSpacer size="s" />
      {known.slice(0, 4).map((feature) => (
        <EuiButtonEmpty
          data-test-subj="significantEventsAppServiceInspectorButton"
          key={feature.uuid}
          size="xs"
          flush="left"
          iconType={feature.type === 'dependency' ? 'graphApp' : 'documents'}
          onClick={() => onInspectFeature(feature)}
          css={css`
            display: flex;
            max-width: 100%;
            height: auto;
            min-height: 28px;
            text-align: left;
          `}
        >
          {feature.title || feature.id}
        </EuiButtonEmpty>
      ))}
      {known.length > 4 && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="sortRight"
          iconSide="right"
          href={core.application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
            path: `/knowledge?${new URLSearchParams({
              entity: entity.id,
              rangeFrom: range.get('rangeFrom') || 'now-24h',
              rangeTo: range.get('rangeTo') || 'now',
            })}`,
          })}
          data-test-subj="serviceInspectorAllKnowledge"
        >
          {i18n.translate('xpack.significantEventsApp.serviceInspector.allKnowledge', {
            defaultMessage: 'All {count} findings',
            values: { count: known.length },
          })}
        </EuiButtonEmpty>
      )}
      {known.length === 0 && (
        <EuiText size="xs" color="subdued">
          <p>{labels.noKnowledge}</p>
        </EuiText>
      )}
      {entity.features.some((feature) => feature.type === 'dependency') && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="xs" color="subdued">
            <p>{labels.downstream}</p>
          </EuiText>
          <EuiSpacer size="s" />
          {entity.features
            .filter((feature) => feature.type === 'dependency')
            .map((feature) => {
              const targetName = feature.properties.target;
              const target = modelEntities.find((candidate) => candidate.name === targetName);
              return target ? (
                <EuiButtonEmpty
                  data-test-subj="significantEventsAppServiceInspectorButton"
                  key={feature.uuid}
                  size="xs"
                  flush="left"
                  iconType="sortRight"
                  onClick={() => onSelect(target.id)}
                >
                  {target.label}
                </EuiButtonEmpty>
              ) : null;
            })}
        </>
      )}
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={contextId}
        buttonContent={i18n.translate(
          'xpack.significantEventsApp.serviceInspector.evidenceSources',
          { defaultMessage: 'Sources & metadata' }
        )}
        paddingSize="s"
      >
        <EuiText size="xs" color="subdued">
          <p>
            {entity.subtype.replace(/_/g, ' ')} · {labels.freshness}: {date(latest)}
          </p>
        </EuiText>
        {infrastructure.length > 0 && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiText size="xs" color="subdued">
              <p>{labels.infrastructure}</p>
            </EuiText>
            <EuiSpacer size="s" />
            {infrastructure.map((feature) => (
              <EuiButtonEmpty
                data-test-subj="significantEventsAppServiceInspectorButton"
                key={feature.uuid}
                size="xs"
                iconType="boxesVertical"
                flush="left"
                onClick={() => onInspectFeature(feature)}
              >
                {feature.title || feature.id}
              </EuiButtonEmpty>
            ))}
          </>
        )}
        <EuiText size="xs" color="subdued">
          <p>{labels.sources}</p>
          {entity.streams.map((stream) => (
            <p
              key={stream}
              css={css`
                overflow-wrap: anywhere;
                font-family: ${euiTheme.font.familyCode};
              `}
            >
              {stream}
            </p>
          ))}
        </EuiText>
      </EuiAccordion>
    </EuiPanel>
  );
};
