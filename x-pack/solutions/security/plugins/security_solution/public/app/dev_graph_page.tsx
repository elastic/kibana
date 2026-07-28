/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * DEV / PR preview only — remove this page and its route before merging to main.
 *
 * Navigate to: /app/security/dev-graph
 *
 * Mock data uses scenarioComplexPreview (see use_fetch_graph_data.ts).
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GraphInvestigation } from '@kbn/cloud-security-posture-graph';
import { useKibana } from '../common/lib/kibana';

const TIME_RANGE = {
  from: 'now-24h',
  to: 'now',
};

const ORIGIN_ENTITY_IDS = [
  { id: 'dev-origin-alice', isOrigin: true },
  { id: 'metadata-preview-target', isOrigin: true },
];

const ORIGIN_EVENT_IDS = [
  { id: 'dev-event-1', isAlert: true },
  { id: 'dev-event-2', isAlert: false },
];

/** Keep the KQL bar closed by default on this preview page. */
const TOGGLE_SEARCH_BAR_STORAGE_KEY =
  'securitySolution.graphInvestigation:toggleSearchBarState' as const;

type SearchPrototypeVariant = 'split' | 'unified';

const VARIANT_OPTIONS: Array<{ id: SearchPrototypeVariant; label: string }> = [
  { id: 'split', label: 'Option A — atual' },
  { id: 'unified', label: 'Option B — search unificado' },
];

export const DevGraphPage = () => {
  const { dataViews } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const [dataView, setDataView] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Default to Option B so the dropdown arrow prototype is visible first.
  const [searchVariant, setSearchVariant] = useState<SearchPrototypeVariant>('unified');

  useEffect(() => {
    try {
      sessionStorage.setItem(TOGGLE_SEARCH_BAR_STORAGE_KEY, JSON.stringify(false));
    } catch {
      // Ignore storage failures in local preview.
    }
  }, []);

  useEffect(() => {
    dataViews
      .getDefaultDataView()
      .then((dv) => {
        if (dv) {
          setDataView(dv);
        } else {
          dataViews
            .create({ title: '.alerts-*', timeFieldName: '@timestamp' })
            .then(setDataView)
            .catch(() => setError('Could not create data view'));
        }
      })
      .catch(() => setError('Could not load default data view'));
  }, [dataViews]);

  if (error) {
    return <EuiText color="danger">{error}</EuiText>;
  }

  if (!dataView) {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        `}
      >
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        height: 100%;
        min-height: 0;
        width: 100%;
        overflow: hidden;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel
          paddingSize="s"
          hasShadow={false}
          css={css`
            border-bottom: ${euiTheme.border.thin};
            background: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{'Search prototype'}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend="Search controls prototype variant"
                options={VARIANT_OPTIONS}
                idSelected={searchVariant}
                onChange={(id) => setSearchVariant(id as SearchPrototypeVariant)}
                buttonSize="compressed"
                color="primary"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {searchVariant === 'split'
                  ? 'A (atual): KQL no botão de cima · busca no gráfico no bottom'
                  : 'B: bottom sem search · botão de cima com seta abre menu (KQL ou busca no gráfico)'}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        css={css`
          min-height: 0;
          overflow: hidden;
        `}
      >
        <GraphInvestigation
          key={searchVariant}
          scopeId="dev-graph-preview"
          initialState={{
            dataView,
            originEventIds: ORIGIN_EVENT_IDS,
            entityIds: ORIGIN_ENTITY_IDS,
            timeRange: TIME_RANGE,
          }}
          showToggleSearch={true}
          showInvestigateInTimeline={true}
          searchControlsVariant={searchVariant}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
