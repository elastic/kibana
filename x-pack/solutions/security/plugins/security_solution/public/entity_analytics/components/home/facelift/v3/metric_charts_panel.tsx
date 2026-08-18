/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { HeaderSection } from '../../../../../common/components/header_section';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { KpiPanel } from '../../../../../detections/components/alerts_kpis/common/components';
import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from './data';
import { SignalCards } from './signal_cards';
import { SummaryCharts } from './summary_charts';

const METRIC_CHARTS_PANEL_ID = 'ea-facelift-v3-metric-charts-panel';

export type MetricChartsView = 'needsAttention' | 'summary';

const VIEW_OPTIONS: Array<{ id: MetricChartsView; label: string }> = [
  {
    id: 'needsAttention',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.homePage.metricCharts.needsAttention',
      { defaultMessage: 'Needs attention' }
    ),
  },
  {
    id: 'summary',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.homePage.metricCharts.summary',
      { defaultMessage: 'Summary' }
    ),
  },
];

const LEGEND = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.metricCharts.legend',
  { defaultMessage: 'Metric charts view' }
);

const TOGGLE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.metricCharts.toggleAriaLabel',
  { defaultMessage: 'Toggle metric charts' }
);

export interface MetricChartsPanelProps {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  /** Top filter group — Summary charts count the same corpus as the Entities table. */
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Alerts-page-style KPI panel: chevron expand/collapse + view button group.
 * Body: metric cards under Needs attention; Risk / Criticality / Sources under Summary.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = ({
  activeFilter,
  cards,
  pageFilters,
  tableView,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => {
  const { euiTheme } = useEuiTheme();
  const { toggleStatus: isExpanded, setToggleStatus: setIsExpanded } =
    useQueryToggle(METRIC_CHARTS_PANEL_ID);
  const [view, setView] = useState<MetricChartsView>('needsAttention');

  const toggleQuery = useCallback(
    (status: boolean) => {
      setIsExpanded(status);
    },
    [setIsExpanded]
  );

  const title = useMemo(() => {
    if (!isExpanded) {
      return null;
    }
    return (
      <div
        css={css`
          margin-left: ${euiTheme.size.s};
        `}
      >
        <EuiButtonGroup
          name="ea-facelift-v3-metric-charts-view"
          legend={LEGEND}
          options={VIEW_OPTIONS}
          idSelected={view}
          onChange={(id) => setView(id as MetricChartsView)}
          buttonSize="compressed"
          color="primary"
          data-test-subj="eaFaceliftMetricChartsViewToggle"
        />
      </div>
    );
  }, [euiTheme.size.s, isExpanded, view]);

  return (
    <KpiPanel
      $toggleStatus={isExpanded}
      hasBorder
      data-test-subj="eaFaceliftMetricChartsPanel"
    >
      {/*
        HeaderSection `.toggle-expand` uses 24px margin; padding on this wrapper
        (not margin) so the gap under the toggle is a stable 16px.
      */}
      <div
        css={css`
          padding-bottom: 16px;

          & > [data-test-subj='header-section'] {
            margin-bottom: 0 !important;
          }
        `}
      >
        <HeaderSection
          outerDirection="row"
          title={title}
          titleSize="s"
          hideSubtitle
          showInspectButton={false}
          toggleStatus={isExpanded}
          toggleAriaLabel={TOGGLE_ARIA_LABEL}
          toggleQuery={toggleQuery}
        />
      </div>
      {isExpanded && view === 'needsAttention' ? (
        <SignalCards
          activeFilter={activeFilter}
          cards={cards}
          onFilterForCard={onFilterForCard}
          onFilterOutCard={onFilterOutCard}
          onAddCardToTimeline={onAddCardToTimeline}
        />
      ) : null}
      {isExpanded && view === 'summary' ? (
        <SummaryCharts pageFilters={pageFilters} tableView={tableView} />
      ) : null}
    </KpiPanel>
  );
};
