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
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
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
import { getStreamDeployment } from './deployment_scope';
import { EngineDrawer } from './engine_drawer';
import { RulesWorkspace } from './rules_workspace';
import { useEngineActivity } from './use_engine_activity';
import { DetectionSummaryBanner, type SummaryMetric } from './summary_banner';
import { journey } from './journey_translations';
import { DetectionEventsFeed } from './events_feed';
import { SignificantEventFlyout } from '../significant_events/components/significant_events_tab/significant_event_flyout';
import { DetectionFlyout } from '../significant_events/components/detections_tab/detection_flyout';
import { DetectionTopology } from './topology';
import { DetectionTimeline } from './timeline';
import { useDetectionData } from './use_detection_data';
import { labels } from './translations';
import { useViewportSpace } from './use_viewport_space';
import {
  EvidenceContext,
  evidenceSearch,
  useEvidence,
  type EvidenceTarget,
} from '../../components/evidence_chain/evidence_context';
import { useFetchDetectionHistory } from '../../hooks/use_fetch_detections';

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

export const DetectionPage = (): React.ReactElement => {
  const history = useHistory();
  const location = useLocation();
  const pocMode = new URLSearchParams(location.search).get('poc') === 'true';
  const togglePocMode = useCallback(
    (enabled: boolean): void => {
      const next = new URLSearchParams(history.location.search);
      if (enabled) {
        next.set('poc', 'true');
        next.set('view', 'events');
        next.delete('coverage');
        next.delete('overviewFilter');
        next.delete('deployment');
        if (next.get('drawer') === 'engine') next.delete('drawer');
        next.delete('engine');
      } else {
        next.delete('poc');
        next.set('view', 'overview');
      }
      history.replace({ ...history.location, search: next.toString() });
    },
    [history]
  );
  return (
    <WorkspacePage nextSteps={{ enabled: pocMode, onChange: togglePocMode }}>
      <DetectionWorkspace />
    </WorkspacePage>
  );
};

const DetectionWorkspace = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const sidebar = useViewportSpace<HTMLDivElement>();
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
  const selectedIds = [...new Set(params.getAll('entity'))];
  const pocMode = params.get('poc') === 'true';
  const deployment = !pocMode ? params.get('deployment') || undefined : undefined;
  const showCoverageGaps = !pocMode && params.get('coverage') === 'uncovered';
  const requestedView = params.get('view') || (pocMode ? 'events' : 'overview');
  const view =
    pocMode && !['rules', 'events', 'services'].includes(requestedView)
      ? 'events'
      : requestedView === 'services'
      ? 'rules'
      : ['overview', 'rules', 'timeline', 'events'].includes(requestedView)
      ? requestedView
      : 'overview';
  const serviceFilter = !pocMode ? params.get('overviewFilter') : undefined;
  const drawerParam = params.get('drawer');
  const legacyDrawer = params.get('engine');
  const drawer =
    drawerParam === 'engine' || drawerParam === 'sources'
      ? drawerParam
      : legacyDrawer === 'streams'
      ? 'sources'
      : legacyDrawer === 'activity'
      ? 'engine'
      : undefined;
  useEffect(() => {
    const legacyView = ['activity', 'streams', 'sources'].includes(requestedView);
    if (!legacyView && !legacyDrawer && drawer !== 'sources') return;
    const next = new URLSearchParams(history.location.search);
    if (legacyView) {
      next.set('drawer', requestedView === 'activity' ? 'engine' : 'sources');
      next.delete('view');
    } else if (drawer) {
      next.set('drawer', drawer);
    }
    next.delete('engine');
    if (next.get('drawer') === 'sources') {
      next.delete('drawer');
      history.replace({ pathname: '/detection/sources', search: next.toString() });
      return;
    }
    history.replace({ ...history.location, search: next.toString() });
  }, [history, requestedView, legacyDrawer, drawer]);
  const [search, setSearch] = useState('');
  const [openedEvent, setOpenedEvent] = useState<SignificantEventResponse>();
  const [openedDetection, setOpenedDetection] = useState<Detection>();
  const [inspected, setInspected] = useState<KnowledgeIndicator>();
  const linkedEvent = useFetchSignificantEventLifecycle(params.get('eventId') || undefined);
  const query = useDetectionData(rangeFrom, rangeTo);
  const engineActivity = useEngineActivity();
  const linkedDetectionHistory = useFetchDetectionHistory(params.get('detectionRule') || undefined);
  const navigateEvidence = (target: EvidenceTarget): void => {
    setInspected(undefined);
    setOpenedDetection(undefined);
    setOpenedEvent(undefined);
    const next = evidenceSearch(history.location.search, target);
    if (target.kind === 'source') {
      history.push({ pathname: '/detection/sources', search: next.toString() });
      return;
    }
    if (target.stream && ['rule', 'detection'].includes(target.kind)) {
      const owners = buildDetectionModel(
        data?.features.features ?? [],
        data?.queries.queries ?? [],
        data?.detections.hits ?? [],
        data?.events.hits ?? []
      ).entities.filter((entity) => entity.streams.includes(target.stream || ''));
      if (owners.length === 1) {
        next.delete('entity');
        next.append('entity', owners[0].id);
        next.delete('overviewFilter');
        next.delete('coverage');
        next.delete('deployment');
      }
    }
    history.replace({ ...history.location, search: next.toString() });
  };
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
  const toggleService = useCallback(
    (id: string) => {
      const next = new URLSearchParams(history.location.search);
      const ids = new Set(next.getAll('entity'));
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      next.delete('entity');
      for (const entityId of ids) next.append('entity', entityId);
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
    const detectionId = params.get('detectionId');
    if (!detectionId) setOpenedDetection(undefined);
    if (!params.get('eventId')) setOpenedEvent(undefined);
    if (!params.get('ruleId') && !params.get('knowledgeId')) setInspected(undefined);
    const detection =
      data?.detections.hits.find((item) => item.detection_id === detectionId) ??
      linkedDetectionHistory.data?.hits.find((item) => item.detection_id === detectionId);
    if (detection) {
      setOpenedDetection(detection);
      setInspected(undefined);
      setOpenedEvent(undefined);
      return;
    }
    const featureId = params.get('knowledgeId');
    const ruleId = params.get('ruleId');
    const streamName = params.get('stream');
    const feature = data?.features.features.find(
      (item) =>
        (item.id === featureId || item.uuid === featureId) &&
        (!streamName || item.stream_name === streamName)
    );
    const rule = data?.queries.queries.find(
      (item) =>
        (item.id === ruleId || item.rule_uuid === ruleId) &&
        (!streamName || item.stream_name === streamName)
    );
    if (feature) setInspected({ kind: 'feature', feature });
    else if (rule)
      setInspected({
        kind: 'query',
        query: rule,
        stream_name: rule.stream_name,
        rule: { backed: rule.rule_backed, id: rule.id },
      });
  }, [data, params, linkedDetectionHistory.data]);
  useEffect(() => {
    const event = linkedEvent.data?.events.at(-1);
    if (event && event.event_id === params.get('eventId')) {
      setOpenedEvent(event);
      setOpenedDetection(undefined);
      setInspected(undefined);
    }
  }, [linkedEvent.data, params]);
  const deploymentStreams = [
    ...(data?.features.features ?? []).map((feature) => feature.stream_name),
    ...(data?.queries.queries ?? []).map((rule) => rule.stream_name),
    ...(engineActivity.data?.streams ?? [])
      .filter((stream) => stream.watched)
      .map((stream) => stream.name),
  ];
  const deployments = [
    ...new Set(deploymentStreams.map(getStreamDeployment).filter(Boolean)),
  ].sort();
  const inDeployment = (stream: string): boolean =>
    !deployment || getStreamDeployment(stream) === deployment;
  const deploymentFeatures = (data?.features.features ?? []).filter((feature) =>
    inDeployment(feature.stream_name)
  );
  const deploymentQueries = (data?.queries.queries ?? []).filter((rule) =>
    inDeployment(rule.stream_name)
  );
  const deploymentDetections = (data?.detections.hits ?? []).filter((detection) =>
    inDeployment(detection.stream_name)
  );
  const deploymentEvents = (data?.events.hits ?? []).filter(
    (event) => !deployment || event.stream_names.some(inDeployment)
  );
  const deploymentActivity = (data?.activity.activities ?? []).filter((item) =>
    inDeployment(item.stream_name)
  );
  const deploymentModel = deployment
    ? buildDetectionModel(
        deploymentFeatures,
        deploymentQueries,
        deploymentDetections,
        deploymentEvents
      )
    : model;
  const servicePresets = [
    {
      id: 'events',
      label: i18n.translate('xpack.significantEventsApp.overviewPresets.withEvents', {
        defaultMessage: 'All with events',
      }),
      hint: i18n.translate('xpack.significantEventsApp.overviewPresets.withEventsHint', {
        defaultMessage:
          'Services with detections or significant events in the selected time range.',
      }),
      icon: 'bell',
      matches: (entity: DetectionEntity): boolean =>
        entity.events.length > 0 || entity.detections.length > 0,
    },
    {
      id: 'rules',
      label: i18n.translate('xpack.significantEventsApp.overviewPresets.withRules', {
        defaultMessage: 'All with rules',
      }),
      hint: i18n.translate('xpack.significantEventsApp.overviewPresets.withRulesHint', {
        defaultMessage: 'Services with at least one active rule.',
      }),
      icon: 'bolt',
      matches: hasRuleCoverage,
    },
    {
      id: 'withoutRules',
      label: i18n.translate('xpack.significantEventsApp.overviewPresets.withoutRules', {
        defaultMessage: 'All without rules',
      }),
      hint: i18n.translate('xpack.significantEventsApp.overviewPresets.withoutRulesHint', {
        defaultMessage: 'Services without an active rule.',
      }),
      icon: 'minusInCircle',
      matches: (entity: DetectionEntity): boolean => !hasRuleCoverage(entity),
    },
  ];
  const activePreset = servicePresets.find((preset) => preset.id === serviceFilter);
  const presetEntities = activePreset
    ? deploymentModel.entities.filter(activePreset.matches)
    : deploymentModel.entities;
  const selectServicePreset = (id?: string): void => {
    const next = new URLSearchParams(history.location.search);
    if (id) next.set('overviewFilter', id);
    else next.delete('overviewFilter');
    next.delete('entity');
    next.delete('coverage');
    setSearch('');
    history.replace({ ...history.location, search: next.toString() });
  };
  const selectedEntities = presetEntities.filter((entity) => selectedIds.includes(entity.id));
  const selected = selectedEntities.length === 1 ? selectedEntities[0] : undefined;
  const scopeEntities = selectedEntities.length ? selectedEntities : presetEntities;
  const serviceScopeLabel =
    selectedEntities.length > 1
      ? i18n.translate('xpack.significantEventsApp.serviceFilter.selectedCount', {
          defaultMessage: '{count} selected services',
          values: { count: selectedEntities.length },
        })
      : selected?.label;
  const scopeLabel = [deployment, serviceScopeLabel || activePreset?.label]
    .filter(Boolean)
    .join(' · ');
  const servicePriority = (entity: DetectionEntity): number =>
    entity.events.some((event) => event.status === 'active') ? 0 : hasRuleCoverage(entity) ? 1 : 2;
  const alphabeticalOrder = new Intl.Collator(i18n.getLocale(), {
    sensitivity: 'base',
    numeric: true,
  });
  const visibleEntities = presetEntities
    .filter(
      (entity) =>
        (view !== 'rules' || entity.queries.length > 0) &&
        (!showCoverageGaps || !hasRuleCoverage(entity)) &&
        `${entity.label} ${entity.name} ${entity.namespace}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )
    .sort(
      (left, right) =>
        servicePriority(left) - servicePriority(right) ||
        alphabeticalOrder.compare(left.label, right.label) ||
        alphabeticalOrder.compare(left.namespace, right.namespace) ||
        alphabeticalOrder.compare(left.id, right.id)
    );
  const coveredServices = scopeEntities.filter(hasRuleCoverage).length;
  const gapEntities = deploymentModel.entities.filter((entity) => !hasRuleCoverage(entity));
  const topologyEntities = showCoverageGaps ? gapEntities : presetEntities;
  const topologyIds = new Set(topologyEntities.map((entity) => entity.id));
  const topologyModel = {
    ...deploymentModel,
    entities: topologyEntities,
    relationships: deploymentModel.relationships.filter(
      (edge) => topologyIds.has(edge.source) && topologyIds.has(edge.target)
    ),
  };
  const hasServiceScope = selectedEntities.length > 0 || Boolean(activePreset);
  const scopeQueries = hasServiceScope
    ? [
        ...new Map(
          scopeEntities
            .flatMap((entity) => entity.queries)
            .map((rule) => [`${rule.stream_name}:${rule.id}`, rule])
        ).values(),
      ]
    : deploymentQueries;
  const scopeDetections = hasServiceScope
    ? [
        ...new Map(
          scopeEntities
            .flatMap((entity) => entity.detections)
            .map((detection) => [detection.detection_id, detection])
        ).values(),
      ]
    : deploymentDetections;
  const scopeEvents = hasServiceScope
    ? [
        ...new Map(
          scopeEntities.flatMap((entity) => entity.events).map((event) => [event.event_uuid, event])
        ).values(),
      ]
    : deploymentEvents;
  const scopeStreams = hasServiceScope
    ? [...new Set(scopeEntities.flatMap((entity) => entity.streams))]
    : deployment
    ? [...new Set(deploymentStreams.filter(inDeployment))]
    : undefined;
  const scopeFeatures = scopeStreams
    ? deploymentFeatures.filter((feature) => scopeStreams.includes(feature.stream_name))
    : deploymentFeatures;
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
  const inspectFeature = (feature: Feature): void =>
    navigateEvidence({ kind: 'feature', id: feature.id, stream: feature.stream_name });
  const inspectRule = (rule: QueryWithOccurrences): void =>
    navigateEvidence({ kind: 'rule', id: rule.rule_uuid || rule.id, stream: rule.stream_name });
  const openDetection = (detection: Detection): void =>
    navigateEvidence({
      kind: 'detection',
      id: detection.detection_id,
      ruleId: detection.rule_uuid,
      stream: detection.stream_name,
    });
  const openEvent = (event: SignificantEventResponse): void =>
    navigateEvidence({ kind: 'event', id: event.event_id });
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

  const missingReference =
    !query.isFetching &&
    ((params.get('knowledgeId') &&
      !data.features.features.some(
        (feature) =>
          (feature.id === params.get('knowledgeId') ||
            feature.uuid === params.get('knowledgeId')) &&
          (!params.get('stream') || feature.stream_name === params.get('stream'))
      )) ||
      (params.get('ruleId') &&
        !data.queries.queries.some(
          (rule) => rule.id === params.get('ruleId') || rule.rule_uuid === params.get('ruleId')
        )) ||
      (params.get('detectionId') &&
        !linkedDetectionHistory.isLoading &&
        !data.detections.hits.some(
          (detection) => detection.detection_id === params.get('detectionId')
        ) &&
        !linkedDetectionHistory.data?.hits.some(
          (detection) => detection.detection_id === params.get('detectionId')
        )));
  const totals: SummaryMetric[] = [
    {
      label: labels.entities,
      value: scopeEntities.length,
      hint: labels.entitiesHint,
      icon: 'graphApp',
    },
    {
      label: labels.knowledge,
      value: scopeFeatures.filter(
        (feature) =>
          !feature.excluded && (!feature.expires_at || Date.parse(feature.expires_at) > Date.now())
      ).length,
      hint: labels.knowledgeHint,
      icon: 'documents',
    },
    {
      label: labels.rules,
      value: scopeQueries.filter((rule) => rule.rule_backed).length,
      hint: labels.rulesHint,
      icon: 'bolt',
    },
    {
      label: labels.detections,
      value: deployment || hasServiceScope ? scopeDetections.length : data.detections.total,
      hint: labels.detectionsHint,
      icon: 'visLine',
    },
    {
      label: labels.events,
      value: deployment || hasServiceScope ? scopeEvents.length : data.events.total,
      hint: labels.eventsHint,
      icon: 'bell',
    },
  ];
  const viewTabs = [
    { id: 'overview', label: labels.overview },
    { id: 'timeline', label: labels.browseTimeline },
    { id: 'events', label: labels.browseEvents },
    { id: 'rules', label: labels.browseRules },
  ].filter((tab) => !pocMode || tab.id === 'rules' || tab.id === 'events');

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
    <EvidenceContext.Provider
      value={{
        data: {
          features: data.features.features,
          queries: data.queries.queries,
          detections: data.detections.hits,
          events: data.events.hits,
        },
        onNavigate: navigateEvidence,
      }}
    >
      <div
        data-test-subj="detectionWorkspace"
        css={css`
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
        {missingReference && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              title={i18n.translate('xpack.significantEventsApp.detail.referenceUnavailable', {
                defaultMessage: 'The referenced record is unavailable in the retained data.',
              })}
            >
              <EuiButtonEmpty
                size="xs"
                onClick={() => {
                  const next = new URLSearchParams(history.location.search);
                  for (const key of ['knowledgeId', 'ruleId', 'detectionId', 'detectionRule'])
                    next.delete(key);
                  history.replace({ ...history.location, search: next.toString() });
                }}
                data-test-subj="dismissMissingEvidenceReference"
              >
                {i18n.translate('xpack.significantEventsApp.detail.returnToService', {
                  defaultMessage: 'Return to this service',
                })}
              </EuiButtonEmpty>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <DetectionSummaryBanner
          metrics={totals}
          range={`${rangeFrom}:${rangeTo}:${JSON.stringify([
            deployment || '',
            [...selectedIds].sort(),
            serviceFilter || '',
            showCoverageGaps,
          ])}`}
          nextSteps={pocMode}
          watchedSources={engineActivity.data?.streams.filter((stream) => stream.watched).length}
          drawer={drawer}
          coverage={{
            covered: coveredServices,
            total: scopeEntities.length,
            partial: data.queries.total > data.queries.queries.length,
            showGaps: showCoverageGaps,
            onToggleGaps: () => {
              updateParam('overviewFilter');
              updateParam('coverage', showCoverageGaps ? undefined : 'uncovered');
              updateParam('entity');
              updateParam('view', 'overview');
            },
          }}
          updatedAt={date(new Date(query.dataUpdatedAt).toISOString())}
          refreshing={query.isFetching}
          onRefresh={refresh}
          onOpenEngine={() => updateParam('drawer', 'engine')}
        />
        <EuiSpacer size="m" />
        {model.entities.length === 0 && deployments.length === 0 && view === 'overview' ? (
          <>
            {viewNavigation}
            <EuiEmptyPrompt
              iconType="graphApp"
              title={<h2>{labels.emptyTitle}</h2>}
              body={<p>{labels.emptyBody}</p>}
              actions={
                <EuiButton
                  data-test-subj="significantEventsAppDetectionWorkspaceButton"
                  onClick={() => navigateEvidence({ kind: 'source', id: '' })}
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
              <div
                ref={sidebar.ref}
                style={{ height: sidebar.height }}
                css={css`
                  min-height: 0;
                  @media (max-width: 900px) {
                    max-height: 520px;
                  }
                `}
              >
                <EuiPanel
                  paddingSize="m"
                  hasShadow={false}
                  css={[
                    panelCss,
                    css`
                      height: 100%;
                      display: flex;
                      flex-direction: column;
                      overflow-y: auto;
                    `,
                  ]}
                >
                  <div
                    css={css`
                      flex: 0 0 auto;
                    `}
                  >
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
                          ? i18n.translate(
                              'xpack.significantEventsApp.ruleCoverage.uncoveredServices',
                              {
                                defaultMessage: 'Services without rules',
                              }
                            )
                          : labels.services}{' '}
                        ·{' '}
                        {number(
                          showCoverageGaps ? gapEntities.length : deploymentModel.entities.length
                        )}
                      </p>
                    </EuiText>
                    {!pocMode && (
                      <>
                        <EuiText size="xs" color="subdued">
                          <p>
                            {i18n.translate('xpack.significantEventsApp.deploymentFilter.label', {
                              defaultMessage: 'Deployment',
                            })}
                          </p>
                        </EuiText>
                        <EuiSpacer size="xs" />
                        <EuiSelect
                          compressed
                          fullWidth
                          value={deployment || ''}
                          aria-label={i18n.translate(
                            'xpack.significantEventsApp.deploymentFilter.label',
                            {
                              defaultMessage: 'Deployment',
                            }
                          )}
                          options={[
                            {
                              value: '',
                              text: i18n.translate(
                                'xpack.significantEventsApp.deploymentFilter.all',
                                {
                                  defaultMessage: 'All deployments',
                                }
                              ),
                            },
                            ...deployments.map((name) => ({ value: name, text: name })),
                          ]}
                          onChange={(event) => {
                            const next = new URLSearchParams(history.location.search);
                            if (event.target.value) next.set('deployment', event.target.value);
                            else next.delete('deployment');
                            next.delete('entity');
                            history.replace({ ...history.location, search: next.toString() });
                          }}
                          data-test-subj="detectionDeploymentFilter"
                        />
                        <EuiSpacer size="m" />
                      </>
                    )}
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
                      aria-pressed={
                        selectedEntities.length === 0 && !activePreset && !showCoverageGaps
                      }
                      onClick={() => selectServicePreset()}
                      css={css`
                        width: 100%;
                        text-align: left;
                        padding: ${euiTheme.size.s};
                        border-radius: ${euiTheme.border.radius.medium};
                        background: ${selectedEntities.length === 0 &&
                        !activePreset &&
                        !showCoverageGaps
                          ? `color-mix(in srgb, ${euiTheme.colors.primary} 10%, transparent)`
                          : 'transparent'};
                        color: ${selectedEntities.length === 0 && !activePreset && !showCoverageGaps
                          ? euiTheme.colors.primary
                          : euiTheme.colors.text};
                        font-size: ${euiTheme.font.scale.s}rem;
                        font-weight: ${euiTheme.font.weight.semiBold};
                        &:focus-visible {
                          outline: 2px solid ${euiTheme.colors.primary};
                        }
                      `}
                    >
                      <EuiIcon type="graphApp" aria-hidden={true} /> {labels.allServices}
                    </button>
                    {!pocMode &&
                      servicePresets.map((preset) => {
                        const count = deploymentModel.entities.filter(preset.matches).length;
                        const isActive = activePreset?.id === preset.id;
                        return (
                          <EuiToolTip
                            key={preset.id}
                            content={preset.hint}
                            position="right"
                            display="block"
                          >
                            <button
                              type="button"
                              aria-pressed={isActive}
                              onClick={() => selectServicePreset(preset.id)}
                              data-test-subj={`detectionOverviewPreset-${preset.id}`}
                              css={css`
                                display: flex;
                                align-items: center;
                                gap: ${euiTheme.size.s};
                                width: 100%;
                                text-align: left;
                                padding: ${euiTheme.size.s};
                                margin-top: ${euiTheme.size.xs};
                                border-radius: ${euiTheme.border.radius.medium};
                                background: ${isActive
                                  ? `color-mix(in srgb, ${euiTheme.colors.primary} 10%, transparent)`
                                  : 'transparent'};
                                color: ${isActive
                                  ? euiTheme.colors.primary
                                  : euiTheme.colors.textSubdued};
                                font-size: ${euiTheme.font.scale.s}rem;
                                font-weight: ${isActive
                                  ? euiTheme.font.weight.semiBold
                                  : euiTheme.font.weight.regular};
                                &:hover {
                                  background: ${euiTheme.colors.backgroundBaseSubdued};
                                }
                                &:focus-visible {
                                  outline: 2px solid ${euiTheme.colors.primary};
                                }
                              `}
                            >
                              <EuiIcon type={preset.icon} aria-hidden={true} />
                              <span
                                css={css`
                                  flex: 1;
                                `}
                              >
                                {preset.label}
                              </span>
                              <span
                                css={css`
                                  font-size: ${euiTheme.font.scale.xs}rem;
                                  font-variant-numeric: tabular-nums;
                                `}
                              >
                                {number(count)}
                              </span>
                            </button>
                          </EuiToolTip>
                        );
                      })}
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      <p>
                        {i18n.translate('xpack.significantEventsApp.serviceFilter.help', {
                          defaultMessage: 'Select one or more services',
                        })}
                      </p>
                    </EuiText>
                    <EuiHorizontalRule margin="s" />
                  </div>
                  <div
                    data-test-subj="detectionServiceList"
                    css={css`
                      flex: 1 1 auto;
                      min-height: 80px;
                      overflow-y: auto;
                      overscroll-behavior: contain;
                    `}
                  >
                    {visibleEntities.map((entity) => (
                      <button
                        key={entity.id}
                        type="button"
                        aria-pressed={selectedIds.includes(entity.id)}
                        onClick={() => toggleService(entity.id)}
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
                          background: ${selectedIds.includes(entity.id)
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
                            entity.events.some((event) => event.status === 'active')
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
                        {selectedIds.includes(entity.id) && (
                          <EuiIcon type="check" color="primary" aria-hidden={true} />
                        )}
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
              </div>

              <div
                css={css`
                  min-width: 0;
                `}
              >
                {viewNavigation}
                {selectedEntities.length > 0 && (
                  <>
                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                      <EuiFlexItem>
                        <EuiTitle size="s">
                          <h2>{serviceScopeLabel}</h2>
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
                        {activePreset && topologyEntities.length === 0 ? (
                          <EuiEmptyPrompt
                            iconType={activePreset.icon}
                            title={
                              <h2>
                                {i18n.translate(
                                  'xpack.significantEventsApp.overviewPresets.emptyTitle',
                                  {
                                    defaultMessage: 'No services match this filter',
                                  }
                                )}
                              </h2>
                            }
                            body={<p>{activePreset.hint}</p>}
                            actions={
                              <EuiButtonEmpty
                                size="s"
                                onClick={() => selectServicePreset()}
                                data-test-subj="detectionOverviewPresetClear"
                              >
                                {labels.allServices}
                              </EuiButtonEmpty>
                            }
                          />
                        ) : (
                          <DetectionTopology
                            model={topologyModel}
                            selectedIds={selectedIds.filter((id) =>
                              selectedEntities.some((entity) => entity.id === id)
                            )}
                            onSelect={toggleService}
                            onInspectFeature={inspectFeature}
                          />
                        )}
                      </div>
                      {selected && (
                        <ServiceInspector
                          entity={selected}
                          modelEntities={deploymentModel.entities}
                          relationships={deploymentModel.relationships}
                          onOpenRules={() => {
                            const next = new URLSearchParams(history.location.search);
                            next.set('view', 'rules');
                            history.replace({ ...history.location, search: next.toString() });
                          }}
                          onSelect={toggleService}
                          onInspectFeature={inspectFeature}
                        />
                      )}
                    </div>
                    <EuiSpacer size="l" />
                  </>
                )}

                {view === 'timeline' && (
                  <>
                    <DetectionTimeline
                      entities={scopeEntities}
                      start={data.start}
                      end={data.end}
                      onInspectFeature={inspectFeature}
                      onInspectRule={inspectRule}
                      onOpenEvent={openEvent}
                      onOpenDetection={openDetection}
                      activity={deploymentActivity}
                      queries={scopeQueries}
                      features={scopeFeatures}
                      detections={scopeDetections}
                      events={scopeEvents}
                      selectedStreams={scopeStreams}
                    />
                    <EuiSpacer size="l" />
                  </>
                )}

                {view === 'rules' && (
                  <RulesWorkspace
                    entities={scopeEntities}
                    selected={selected}
                    scopeLabel={scopeLabel}
                    queries={scopeQueries}
                    start={data.start}
                    end={data.end}
                    onInspect={inspectRule}
                    onSelectService={toggleService}
                    allRulesHref={listHref('queries')}
                  />
                )}

                {view === 'events' && (
                  <DetectionEventsFeed
                    detections={scopeDetections}
                    events={scopeEvents}
                    onOpenDetection={openDetection}
                    onOpenEvent={openEvent}
                  />
                )}
              </div>
            </div>
          </>
        )}
        {!pocMode && drawer === 'engine' && <EngineDrawer onClose={() => updateParam('drawer')} />}
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
            onClose={() => {
              setOpenedDetection(undefined);
              updateParam('detectionId');
              updateParam('detectionRule');
            }}
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
    </EvidenceContext.Provider>
  );
};

const ServiceInspector = ({
  entity,
  modelEntities,
  relationships,
  onSelect,
  onInspectFeature,
  onOpenRules,
}: {
  entity: DetectionEntity;
  modelEntities: DetectionEntity[];
  relationships: ReturnType<typeof buildDetectionModel>['relationships'];
  onOpenRules: () => void;
  onSelect: (id: string) => void;
  onInspectFeature: (feature: Feature) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const contextId = useGeneratedHtmlId({ prefix: 'serviceContext' });
  const { core } = useKibana();
  const { href, onNavigate } = useEvidence();
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
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType="visLine"
        iconSide="left"
        onClick={onOpenRules}
        data-test-subj="serviceInspectorViewRules"
      >
        {active ? `${number(active)} ${labels.covered}` : labels.uncovered}
      </EuiButtonEmpty>
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
              const relationship = relationships.find((edge) =>
                edge.features.some((item) => item.uuid === feature.uuid)
              );
              const target = relationship
                ? modelEntities.find((candidate) => candidate.id === relationship.target)
                : undefined;
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
            <EuiButtonEmpty
              key={stream}
              size="xs"
              flush="left"
              iconType="database"
              href={href({ kind: 'source', id: stream, stream })}
              onClick={
                onNavigate
                  ? (event) => {
                      event.preventDefault();
                      onNavigate({ kind: 'source', id: stream, stream });
                    }
                  : undefined
              }
              data-test-subj="serviceInspectorSource"
            >
              {stream}
            </EuiButtonEmpty>
          ))}
        </EuiText>
      </EuiAccordion>
    </EuiPanel>
  );
};
