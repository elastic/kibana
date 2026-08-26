/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { useSeverityData } from './use_severity_data';
import { SeverityLevelChart } from './severity_level_chart';
import { EsqlInspectButton } from './esql_inspect_button';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.severity.title', {
  defaultMessage: 'Severity levels',
});

export interface SeverityLevelPanelProps {
  /** The page's ES|QL query — the chart aggregates on top of it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * "Severity levels" KPI for the Alerts v2 Summary tab — the v2 analogue of the
 * v1 severity panel, backed by an ES|QL aggregation over `.rule-events`.
 */
export const SeverityLevelPanel = ({ query, timeRange }: SeverityLevelPanelProps) => {
  const { data, isLoading, error, inspect } = useSeverityData(query, timeRange);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="alertsV2SeverityPanel">
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
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={i18n.translate('xpack.securitySolution.alertsV2.severity.error', {
            defaultMessage: 'Unable to load severity levels',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : (
        <SeverityLevelChart data={data} isLoading={isLoading} />
      )}
    </EuiPanel>
  );
};
