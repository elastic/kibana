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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GraphInvestigation } from '@kbn/cloud-security-posture-graph';
import { useKibana } from '../common/lib/kibana';

const TIME_RANGE = {
  from: 'now-24h',
  to: 'now',
};

const ORIGIN_ENTITY_IDS = [{ id: 'john.doe', isOrigin: true }];

const ORIGIN_EVENT_IDS = [
  { id: 'dev-event-1', isAlert: true },
  { id: 'dev-event-2', isAlert: false },
];

/** Keep the KQL bar closed by default on this preview page. */
const TOGGLE_SEARCH_BAR_STORAGE_KEY =
  'securitySolution.graphInvestigation:toggleSearchBarState' as const;

type DevGraphTestVariant = 'A' | 'B';

export const DevGraphPage = () => {
  const { dataViews } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testVariant, setTestVariant] = useState<DevGraphTestVariant>('A');

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
        <div
          css={css`
            padding: 8px 12px 0;
          `}
        >
          <EuiTabs size="s">
            <EuiTab
              isSelected={testVariant === 'A'}
              onClick={() => setTestVariant('A')}
            >
              Test A (current)
            </EuiTab>
            <EuiTab
              isSelected={testVariant === 'B'}
              onClick={() => setTestVariant('B')}
            >
              Test B (hover actions)
            </EuiTab>
          </EuiTabs>
          <EuiText size="xs" color="subdued" css={{ padding: '4px 0 8px' }}>
            {testVariant === 'A'
              ? '⋯ in entity header — click to open actions'
              : '⋯ hidden — hover entity to show action icons on top (toggles + tooltips)'}
          </EuiText>
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        css={css`
          min-height: 0;
          overflow: hidden;
        `}
      >
        <GraphInvestigation
          scopeId="dev-graph-preview"
          initialState={{
            dataView,
            originEventIds: ORIGIN_EVENT_IDS,
            entityIds: ORIGIN_ENTITY_IDS,
            timeRange: TIME_RANGE,
          }}
          showToggleSearch={true}
          showInvestigateInTimeline={true}
          searchControlsVariant="unified"
          entityActionsMode={testVariant === 'A' ? 'button' : 'hover'}
          // Enables relationships + details actions in the expand/hover menus for local preview.
          onOpenEventPreview={() => undefined}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
