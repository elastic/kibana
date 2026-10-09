/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldSearch,
  EuiIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Feature } from '@kbn/significant-events-schema';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { WorkspacePage } from '../../components/workspace_page';
import { KnowledgeIndicatorDetailsFlyout } from '../../components/knowledge_indicators/knowledge_indicator_details_flyout';
import { KnowledgeBrowser } from '../detection/knowledge_browser';
import { buildDetectionModel } from '../detection/model';
import { useViewportSpace } from '../detection/use_viewport_space';
import { useEngineActivity } from '../detection/use_engine_activity';
import { labels } from '../detection/translations';
import { useKnowledgeData } from './use_knowledge_data';
import { associateKnowledge, filterKnowledge, type KnowledgeFilters } from './knowledge_model';
import { KnowledgeGraph } from './knowledge_graph';
import { knowledgeLabels as text } from './translations';

export const KnowledgePage = (): React.ReactElement => (
  <WorkspacePage knowledge>
    <KnowledgeWorkspace />
  </WorkspacePage>
);

const KnowledgeWorkspace = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const sidebar = useViewportSpace<HTMLDivElement>();
  const [serviceSearch, setServiceSearch] = useState('');
  const [simulation, setSimulation] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const history = useHistory();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [inspected, setInspected] = useState<KnowledgeIndicator>();
  const [highlighted, setHighlighted] = useState<string>();
  const engine = useEngineActivity({ live: true });
  const learning = Boolean(engine.data?.runs.some((run) => run.active && run.kind === 'learning'));
  const query = useKnowledgeData(
    params.get('rangeFrom') || 'now-24h',
    params.get('rangeTo') || 'now',
    learning
  );
  const model = useMemo(
    () =>
      buildDetectionModel(
        query.data?.features.features ?? [],
        query.data?.queries.queries ?? [],
        [],
        []
      ),
    [query.data]
  );
  const associations = useMemo(
    () =>
      associateKnowledge(
        query.data?.features.features ?? [],
        query.data?.queries.queries ?? [],
        model
      ),
    [query.data, model]
  );
  const requestedIds = useMemo(
    () =>
      params.getAll('service').length
        ? params.getAll('service')
        : params.get('entity')
        ? [params.get('entity') ?? '']
        : [],
    [params]
  );
  const selected = useMemo(
    () => model.entities.filter((entity) => requestedIds.includes(entity.id)),
    [model.entities, requestedIds]
  );
  const deployment = params.get('knowledgeDeployment') ?? '';
  const deployments = [
    ...new Set(model.entities.map((entity) => entity.namespace).filter(Boolean)),
  ].sort();
  const entities = model.entities.filter(
    (entity) => !deployment || entity.namespace === deployment
  );
  const category = params.get('knowledgeCategory');
  const usage = params.get('knowledgeUsage');
  const confidence = params.get('knowledgeConfidence');
  const filters = useMemo<KnowledgeFilters>(
    () => ({
      category:
        category === 'services' ||
        category === 'technologies' ||
        category === 'dependencies' ||
        category === 'infrastructure' ||
        category === 'patterns'
          ? category
          : 'all',
      search: params.get('knowledgeSearch') ?? '',
      usage: usage === 'missing_queries' || usage === 'with_queries' ? usage : 'all',
      confidence: confidence === 'high' || confidence === 'review' ? confidence : 'all',
      freshness: params.get('knowledgeFreshness') === 'recent' ? 'recent' : 'all',
      showExpired: params.get('knowledgeExpired') === 'true',
      showExcluded: params.get('knowledgeExcluded') === 'true',
    }),
    [category, usage, confidence, params]
  );
  const keys: Record<keyof KnowledgeFilters, string> = {
    category: 'knowledgeCategory',
    search: 'knowledgeSearch',
    usage: 'knowledgeUsage',
    confidence: 'knowledgeConfidence',
    freshness: 'knowledgeFreshness',
    showExpired: 'knowledgeExpired',
    showExcluded: 'knowledgeExcluded',
  };
  const changeFilters = (changes: Partial<KnowledgeFilters>): void => {
    const next = new URLSearchParams(history.location.search);
    for (const key of Object.keys(changes) as Array<keyof KnowledgeFilters>) {
      const value = changes[key];
      if (value === false || value === 'all' || value === '') next.delete(keys[key]);
      else if (value !== undefined) next.set(keys[key], String(value));
    }
    history.replace({ ...history.location, search: next.toString() });
  };
  const resetFilters = (): void => {
    const next = new URLSearchParams(history.location.search);
    for (const key of [
      ...Object.values(keys),
      'entity',
      'service',
      'knowledgeDeployment',
      'knowledgeId',
      'ruleId',
    ])
      next.delete(key);
    setInspected(undefined);
    setHighlighted(undefined);
    setServiceSearch('');
    history.replace({ ...history.location, search: next.toString() });
  };
  const selectServices = (ids: string[]): void => {
    const next = new URLSearchParams(history.location.search);
    for (const key of ['entity', 'service', 'knowledgeId', 'ruleId']) next.delete(key);
    for (const id of ids) next.append('service', id);
    setInspected(undefined);
    setHighlighted(undefined);
    history.replace({ ...history.location, search: next.toString() });
  };
  const selectService = (id: string): void =>
    selectServices(selected.length === 1 && selected[0].id === id ? [] : [id]);
  const scopedFeatures = useMemo(() => {
    const all = query.data?.features.features ?? [];
    const ids = new Set(requestedIds);
    return all.filter((feature) => {
      const owners = associations.get(feature.uuid)?.entities ?? [];
      const matchingOwners = owners.filter(
        (entity) => !deployment || entity.namespace === deployment
      );
      const sourceScoped =
        !deployment ||
        matchingOwners.length > 0 ||
        feature.stream_name.split('.').at(-1) === deployment;
      return (
        sourceScoped &&
        (!ids.size ||
          owners.some((entity) => ids.has(entity.id)) ||
          selected.some((entity) => entity.streams.includes(feature.stream_name)))
      );
    });
  }, [query.data, associations, deployment, requestedIds, selected]);
  const visible = useMemo(
    () => filterKnowledge(scopedFeatures, filters, associations, query.dataUpdatedAt || Date.now()),
    [scopedFeatures, filters, associations, query.dataUpdatedAt]
  );
  const inspect = (feature: Feature): void => {
    setHighlighted(feature.uuid);
    setInspected({ kind: 'feature', feature });
  };
  const occurrences = useMemo(
    () =>
      Object.fromEntries(
        (query.data?.queries.queries ?? []).map((rule) => [
          rule.id,
          rule.occurrences.map((occurrence) => ({
            x: Date.parse(occurrence.date),
            y: occurrence.count,
          })),
        ])
      ),
    [query.data]
  );
  const linkedFeature = query.data?.features.features.find(
    (feature) =>
      (feature.uuid === params.get('knowledgeId') || feature.id === params.get('knowledgeId')) &&
      (!params.get('stream') || feature.stream_name === params.get('stream'))
  );
  const linkedRule = query.data?.queries.queries.find(
    (rule) => rule.id === params.get('ruleId') || rule.rule_uuid === params.get('ruleId')
  );
  const linkedIndicator: KnowledgeIndicator | undefined = linkedFeature
    ? { kind: 'feature', feature: linkedFeature }
    : linkedRule
    ? {
        kind: 'query',
        query: linkedRule,
        stream_name: linkedRule.stream_name,
        rule: { backed: linkedRule.rule_backed, id: linkedRule.id },
      }
    : undefined;
  const opened = inspected || linkedIndicator;
  if (query.isLoading) return <EuiLoadingSpinner size="l" />;
  if (!query.data)
    return (
      <EuiCallOut announceOnMount color="warning" title={labels.loadError}>
        <p>{query.error instanceof Error ? query.error.message : labels.loadError}</p>
        <EuiButtonEmpty
          data-test-subj="significantEventsAppKnowledgeWorkspaceButton"
          onClick={() => {
            void query.refetch();
          }}
        >
          {labels.retry}
        </EuiButtonEmpty>
      </EuiCallOut>
    );
  const showGraph = params.get('knowledgeGraph') !== 'hidden';
  const sidebarKnowledge = filterKnowledge(
    query.data.features.features,
    filters,
    associations,
    query.dataUpdatedAt || Date.now()
  );
  const scopeKey = JSON.stringify([requestedIds, deployment, filters]);
  return (
    <div
      data-test-subj="knowledgeWorkspace"
      css={css`
        width: 100%;
        min-width: 0;
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{text.title}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>{text.subtitle}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={text.graph}
                checked={showGraph}
                onChange={(event) => {
                  if (!event.target.checked) setSimulation(false);
                  const next = new URLSearchParams(history.location.search);
                  if (event.target.checked) next.delete('knowledgeGraph');
                  else next.set('knowledgeGraph', 'hidden');
                  history.replace({ ...history.location, search: next.toString() });
                }}
                data-test-subj="knowledgeGraphToggle"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={text.previewHint}>
                <EuiButtonEmpty
                  size="s"
                  iconType={simulation ? 'stop' : 'sparkles'}
                  isDisabled={!visible.length}
                  aria-pressed={simulation}
                  data-test-subj="knowledgeGalaxySimulate"
                  onClick={() => {
                    if (!showGraph) {
                      const next = new URLSearchParams(history.location.search);
                      next.delete('knowledgeGraph');
                      history.replace({ ...history.location, search: next.toString() });
                    }
                    setSimulation((value) => !value);
                  }}
                >
                  {simulation ? text.stopSimulation : text.simulate}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={text.simulationSpeedHint}>
                <EuiSelect
                  compressed
                  aria-label={text.simulationSpeed}
                  value={String(simulationSpeed)}
                  options={[
                    { value: '0.5', text: text.speedSlow },
                    { value: '1', text: text.speedNatural },
                    { value: '2', text: text.speedFast },
                    { value: '5', text: text.speedFaster },
                    { value: '10', text: text.speedFastest },
                  ]}
                  onChange={(event) => setSimulationSpeed(Number(event.target.value))}
                  data-test-subj="knowledgeGalaxySimulationSpeed"
                  css={css`
                    width: 136px;
                  `}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={text.refreshed} disableScreenReaderOutput>
                <EuiButtonIcon
                  data-test-subj="significantEventsAppKnowledgeWorkspaceButton"
                  iconType="refresh"
                  aria-label={text.refreshed}
                  isLoading={query.isFetching}
                  onClick={() => {
                    void query.refetch();
                  }}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <div
        css={css`
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
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
            position: sticky;
            top: ${euiTheme.size.m};
            min-height: 0;
            @media (max-width: 900px) {
              position: relative;
              max-height: 340px;
            }
          `}
        >
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="m"
            css={css`
              height: 100%;
              min-height: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            `}
          >
            <div
              css={css`
                flex: 0 0 auto;
              `}
            >
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="xs">
                    <strong>
                      {text.servicePane} · {entities.length}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
                {selected.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary">{selected.length}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </div>
            <EuiSpacer size="m" />
            <EuiSelect
              compressed
              fullWidth
              aria-label={text.deployments}
              value={deployment}
              options={[
                { value: '', text: text.deployments },
                ...deployments.map((value) => ({ value, text: value })),
              ]}
              onChange={(event) => {
                const next = new URLSearchParams(history.location.search);
                for (const key of ['entity', 'service', 'knowledgeId', 'ruleId']) next.delete(key);
                setInspected(undefined);
                if (event.target.value) next.set('knowledgeDeployment', event.target.value);
                else next.delete('knowledgeDeployment');
                history.replace({ ...history.location, search: next.toString() });
              }}
              data-test-subj="knowledgeDeploymentFilter"
            />
            <EuiSpacer size="s" />
            <EuiFieldSearch
              compressed
              fullWidth
              value={serviceSearch}
              placeholder={labels.search}
              aria-label={labels.search}
              onChange={(event) => setServiceSearch(event.target.value)}
              data-test-subj="knowledgeServiceSearch"
            />
            <EuiSpacer size="s" />
            <EuiButtonEmpty
              size="s"
              flush="left"
              iconType="graphApp"
              onClick={() => selectServices([])}
              aria-pressed={!selected.length}
              data-test-subj="knowledgeAllServices"
              css={css`
                border-radius: ${euiTheme.border.radius.medium};
                background: ${!selected.length
                  ? `color-mix(in srgb, ${euiTheme.colors.primary} 12%, transparent)`
                  : 'transparent'};
              `}
            >
              {labels.allServices}
            </EuiButtonEmpty>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {text.multiSelectHint}
            </EuiText>
            <EuiSpacer size="m" />
            <div
              css={css`
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                border-top: ${euiTheme.border.thin};
                padding-top: ${euiTheme.size.s};
              `}
            >
              {entities
                .filter((entity) =>
                  `${entity.label} ${entity.name} ${entity.namespace}`
                    .toLowerCase()
                    .includes(serviceSearch.toLowerCase())
                )
                .map((entity) => {
                  const active = requestedIds.includes(entity.id);
                  const count = sidebarKnowledge.filter(
                    (feature) =>
                      entity.features.some((item) => item.uuid === feature.uuid) ||
                      entity.streams.includes(feature.stream_name)
                  ).length;
                  return (
                    <button
                      key={entity.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        selectServices(
                          active
                            ? requestedIds.filter((id) => id !== entity.id)
                            : [...requestedIds, entity.id]
                        )
                      }
                      data-test-subj="knowledgeServiceFilter"
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: ${euiTheme.size.s};
                        width: 100%;
                        text-align: left;
                        padding: ${euiTheme.size.s};
                        margin-bottom: 4px;
                        border-radius: ${euiTheme.border.radius.medium};
                        color: ${euiTheme.colors.text};
                        background: ${active
                          ? `color-mix(in srgb, ${euiTheme.colors.primary} 12%, transparent)`
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
                        type={active ? 'checkInCircleFilled' : 'apps'}
                        color={active ? 'primary' : 'subdued'}
                        size="s"
                        aria-hidden={true}
                      />
                      <div
                        css={css`
                          min-width: 0;
                          flex: 1;
                        `}
                      >
                        <EuiText size="xs">
                          <strong>{entity.label}</strong>
                        </EuiText>
                        <EuiText size="xs" color="subdued">
                          {entity.namespace}
                        </EuiText>
                      </div>
                      <EuiToolTip content={text.matchingCount}>
                        <span
                          tabIndex={0}
                          css={css`
                            font-size: ${euiTheme.font.scale.xs}rem;
                            color: ${euiTheme.colors.textSubdued};
                            font-variant-numeric: tabular-nums;
                          `}
                        >
                          {count}
                        </span>
                      </EuiToolTip>
                    </button>
                  );
                })}
            </div>
          </EuiPanel>
        </div>
        <div
          css={css`
            min-width: 0;
          `}
        >
          {query.isError && (
            <>
              <EuiCallOut announceOnMount color="warning" title={labels.loadError} />
              <EuiSpacer size="m" />
            </>
          )}
          <KnowledgeBrowser
            features={scopedFeatures}
            visibleFeatures={visible}
            associations={associations}
            filters={filters}
            onFiltersChange={changeFilters}
            onReset={resetFilters}
            onInspect={inspect}
            onSelectService={selectService}
            onHighlight={setHighlighted}
            graph={
              showGraph ? (
                <KnowledgeGraph
                  features={visible}
                  associations={associations}
                  model={model}
                  scopeKey={scopeKey}
                  learning={learning}
                  onSelectService={selectService}
                  onInspectFeature={inspect}
                  simulation={simulation}
                  simulationSpeed={simulationSpeed}
                  onSimulationComplete={() => setSimulation(false)}
                  focusedId={highlighted}
                  selectedId={opened?.kind === 'feature' ? opened.feature.uuid : undefined}
                />
              ) : undefined
            }
          />
        </div>
      </div>
      {opened && (
        <KnowledgeIndicatorDetailsFlyout
          knowledgeIndicator={opened}
          features={query.data.features.features}
          occurrencesByQueryId={occurrences}
          onClose={() => {
            setInspected(undefined);
            setHighlighted(undefined);
            const next = new URLSearchParams(history.location.search);
            next.delete('knowledgeId');
            next.delete('ruleId');
            history.replace({ ...history.location, search: next.toString() });
          }}
        />
      )}
    </div>
  );
};
