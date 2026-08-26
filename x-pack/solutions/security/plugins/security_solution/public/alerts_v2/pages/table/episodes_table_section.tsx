/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { EsqlInspectButton } from '../kpis/esql_inspect_button';
import { useEpisodesTableData } from './use_episodes_table_data';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.episodesTable.title', {
  defaultMessage: 'Episodes',
});

export interface EpisodesTableSectionProps {
  /** The page's ES|QL query — the table lists episodes from it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * Episodes table below the KPI section. Step 1: a temporary readout verifying the
 * data hook (rows + ad-hoc DataView + flattened mapping). The UnifiedDataTable
 * grid replaces this readout in the next step.
 */
export const EpisodesTableSection = ({ query, timeRange }: EpisodesTableSectionProps) => {
  const { rows, columns, dataView, isLoading, error, inspect } = useEpisodesTableData(
    query,
    timeRange
  );

  const firstRow = rows[0]?.flattened;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertsV2EpisodesTableSection">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EsqlInspectButton inspect={inspect} title={TITLE} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {error ? (
        <EuiCallOut announceOnMount color="danger" iconType="error" size="s" title="Unable to load episodes">
          {error.message}
        </EuiCallOut>
      ) : isLoading ? (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {'Loading episodes…'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText size="s">
          {/* Temporary Step-1 verification readout. */}
          <p>
            <EuiBadge color="hollow">{rows.length}</EuiBadge> {'episodes fetched · '}
            <EuiBadge color="hollow">{columns.length}</EuiBadge> {'columns · DataView '}
            <EuiCode>{dataView?.getIndexPattern() ?? '—'}</EuiCode> {' (time field '}
            <EuiCode>{dataView?.timeFieldName ?? '—'}</EuiCode>
            {')'}
          </p>
          {firstRow ? (
            <p>
              {'First row → '}
              <EuiCode>{`episode.status=${firstRow['episode.status'] ?? '∅'}`}</EuiCode>{' '}
              <EuiCode>{`severity=${firstRow.severity ?? '∅'}`}</EuiCode>{' '}
              <EuiCode>{`rule.id=${firstRow['rule.id'] ?? '∅'}`}</EuiCode>{' '}
              <EuiCode>{`duration=${firstRow.duration ?? '∅'}`}</EuiCode>
            </p>
          ) : (
            <p>{'No episodes in this time range.'}</p>
          )}
        </EuiText>
      )}
    </EuiPanel>
  );
};
