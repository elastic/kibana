/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { SeverityLevelPanel } from './kpis/severity_level_panel';
import { AlertsByRulePanel } from './kpis/alerts_by_rule_panel';
import { TopAlertsByPanel } from './kpis/top_alerts_by_panel';
import { TrendPanel } from './kpis/trend_panel';

export type AlertsV2KpiView = 'summary' | 'trend' | 'counts' | 'treemap';

/** Persists the selected KPI tab, mirroring the v1 `alert-view-selection` key. */
const KPI_VIEW_STORAGE_KEY = 'securitySolution.alertsV2.kpiViewSelection';
const DEFAULT_VIEW: AlertsV2KpiView = 'summary';

interface KpiViewOption {
  id: AlertsV2KpiView;
  label: string;
  /** Placeholder copy describing the chart we'll build for this tab with ES|QL. */
  description: string;
}

const KPI_VIEWS: KpiViewOption[] = [
  {
    id: 'summary',
    label: i18n.translate('xpack.securitySolution.alertsV2.kpis.summary', {
      defaultMessage: 'Summary',
    }),
    description: i18n.translate('xpack.securitySolution.alertsV2.kpis.summaryDescription', {
      defaultMessage: 'Severity breakdown, alerts by rule, and top entity values.',
    }),
  },
  {
    id: 'trend',
    label: i18n.translate('xpack.securitySolution.alertsV2.kpis.trend', {
      defaultMessage: 'Trend',
    }),
    description: i18n.translate('xpack.securitySolution.alertsV2.kpis.trendDescription', {
      defaultMessage: 'Alerts over time as a date histogram.',
    }),
  },
  {
    id: 'counts',
    label: i18n.translate('xpack.securitySolution.alertsV2.kpis.counts', {
      defaultMessage: 'Counts',
    }),
    description: i18n.translate('xpack.securitySolution.alertsV2.kpis.countsDescription', {
      defaultMessage: 'Counts table grouped by rule and entity.',
    }),
  },
  {
    id: 'treemap',
    label: i18n.translate('xpack.securitySolution.alertsV2.kpis.treemap', {
      defaultMessage: 'Treemap',
    }),
    description: i18n.translate('xpack.securitySolution.alertsV2.kpis.treemapDescription', {
      defaultMessage: 'Treemap of alerts by rule and entity.',
    }),
  },
];

export interface AlertsV2KpisSectionProps {
  /** The active ES|QL query — the charts will build on it in later steps. */
  query: AggregateQuery;
  /** The active time range — the charts will scope to it in later steps. */
  timeRange: TimeRange;
}

/**
 * KPI section for the Alerts v2 page. Mirrors the v1 alerts page's tabbed charts
 * panel (Summary / Trend / Counts / Treemap) as a compressed button group with
 * the selection persisted in local storage. Each tab is a placeholder for now;
 * the ES|QL-driven charts are built in the following steps.
 */
export const AlertsV2KpisSection = ({ query, timeRange }: AlertsV2KpisSectionProps) => {
  const [storedView, setStoredView] = useLocalStorage<AlertsV2KpiView>(
    KPI_VIEW_STORAGE_KEY,
    DEFAULT_VIEW
  );
  const selectedView = storedView ?? DEFAULT_VIEW;

  const options = useMemo(() => KPI_VIEWS.map(({ id, label }) => ({ id, label })), []);
  const activeView = useMemo(
    () => KPI_VIEWS.find(({ id }) => id === selectedView) ?? KPI_VIEWS[0],
    [selectedView]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertsV2KpisSection">
      <EuiButtonGroup
        type="single"
        name="alerts-v2-kpi-select"
        legend={i18n.translate('xpack.securitySolution.alertsV2.kpis.legend', {
          defaultMessage: 'Select a KPI view',
        })}
        options={options}
        idSelected={selectedView}
        onChange={(id) => setStoredView(id as AlertsV2KpiView)}
        buttonSize="compressed"
        color="primary"
        data-test-subj="alertsV2KpiSelect"
      />
      <EuiSpacer size="m" />
      {selectedView === 'summary' ? (
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <SeverityLevelPanel query={query} timeRange={timeRange} />
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsByRulePanel query={query} timeRange={timeRange} />
          </EuiFlexItem>
          <EuiFlexItem>
            <TopAlertsByPanel query={query} timeRange={timeRange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : selectedView === 'trend' ? (
        <TrendPanel query={query} timeRange={timeRange} />
      ) : (
        <EuiEmptyPrompt
          iconType="chartBarVerticalStack"
          title={<h3>{activeView.label}</h3>}
          body={
            <EuiText size="s">
              <p>{activeView.description}</p>
              <p>
                <FormattedComingSoon />
              </p>
            </EuiText>
          }
        />
      )}
    </EuiPanel>
  );
};

const FormattedComingSoon = () => (
  <em>
    {i18n.translate('xpack.securitySolution.alertsV2.kpis.comingSoon', {
      defaultMessage: 'Coming soon — this chart will be built with ES|QL.',
    })}
  </em>
);
