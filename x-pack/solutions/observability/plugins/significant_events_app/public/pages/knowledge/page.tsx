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
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldSearch,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Feature } from '@kbn/significant-events-schema';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { WorkspacePage } from '../../components/workspace_page';
import { KnowledgeIndicatorDetailsFlyout } from '../../components/knowledge_indicators/knowledge_indicator_details_flyout';
import { KnowledgeBrowser } from '../detection/knowledge_browser';
import { buildDetectionModel } from '../detection/model';
import { labels } from '../detection/translations';
import { journey } from '../detection/journey_translations';
import { useKnowledgeData } from './use_knowledge_data';

export const KnowledgePage = (): React.ReactElement => (
  <WorkspacePage knowledge>
    <KnowledgeWorkspace />
  </WorkspacePage>
);

const KnowledgeWorkspace = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [search, setSearch] = useState('');
  const [inspected, setInspected] = useState<KnowledgeIndicator>();
  const query = useKnowledgeData(
    params.get('rangeFrom') || 'now-24h',
    params.get('rangeTo') || 'now'
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
  const selected = model.entities.find((entity) => entity.id === params.get('entity'));
  const visibleEntities = model.entities.filter((entity) =>
    `${entity.label} ${entity.name} ${entity.namespace}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const select = (id?: string): void => {
    const next = new URLSearchParams(history.location.search);
    if (id) next.set('entity', id);
    else next.delete('entity');
    history.replace({ ...history.location, search: next.toString() });
  };
  const inspect = (feature: Feature): void => setInspected({ kind: 'feature', feature });
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
  const features = selected
    ? query.data.features.features.filter((feature) =>
        selected.streams.includes(feature.stream_name)
      )
    : query.data.features.features;
  return (
    <div
      data-test-subj="knowledgeWorkspace"
      css={css`
        max-width: 1600px;
        width: 100%;
        margin: 0 auto;
      `}
    >
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
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiText size="xs" color="subdued">
            <strong>
              {journey.services} · {model.entities.length}
            </strong>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFieldSearch
            compressed
            fullWidth
            placeholder={labels.search}
            aria-label={labels.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-test-subj="knowledgeServiceSearch"
          />
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="s"
            iconType="documents"
            onClick={() => select()}
            aria-pressed={!selected}
            data-test-subj="knowledgeAllServices"
          >
            {labels.allServices}
          </EuiButtonEmpty>
          <div
            css={css`
              max-height: 650px;
              overflow-y: auto;
            `}
          >
            {visibleEntities.map((entity) => (
              <button
                key={entity.id}
                type="button"
                aria-pressed={selected?.id === entity.id}
                onClick={() => select(entity.id)}
                data-test-subj="knowledgeServiceFilter"
                css={css`
                  display: block;
                  width: 100%;
                  text-align: left;
                  padding: ${euiTheme.size.s};
                  margin-top: ${euiTheme.size.xs};
                  border-radius: ${euiTheme.border.radius.medium};
                  color: ${euiTheme.colors.text};
                  background: ${selected?.id === entity.id
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
                <EuiText size="xs">
                  <strong>{entity.label}</strong>
                </EuiText>
                {entity.namespace && (
                  <EuiText size="xs" color="subdued">
                    {entity.namespace}
                  </EuiText>
                )}
              </button>
            ))}
          </div>
        </EuiPanel>
        <div
          css={css`
            min-width: 0;
          `}
        >
          {query.isError && <EuiCallOut announceOnMount color="warning" title={labels.loadError} />}
          {query.data.queries.total > query.data.queries.queries.length && (
            <EuiCallOut announceOnMount color="warning" title={labels.partial} />
          )}
          <KnowledgeBrowser
            features={features}
            model={model}
            onInspect={inspect}
            onSelectService={select}
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
