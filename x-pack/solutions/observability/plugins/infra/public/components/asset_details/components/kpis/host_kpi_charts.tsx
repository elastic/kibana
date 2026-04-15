/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { Kpi } from './kpi';
import { useHostKpiCharts } from '../../hooks/use_host_metrics_charts';
import { ChartPlaceholder } from '../../../lens/chart_placeholder';
import { KPI_CHART_HEIGHT } from '../../../../common/visualizations/constants';
import type { InfraHttpError } from '../../../../types';

export interface HostKpiChartsProps {
  dataView?: DataView;
  dateRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  lastReloadRequestTime?: number;
  getSubtitle?: (formulaValue: string) => string;
  loading?: boolean;
  error?: InfraHttpError;
  hasData?: boolean;
  schema?: DataSchemaFormat | null;
}

export const HostKpiCharts = ({
  dateRange,
  dataView,
  filters,
  getSubtitle,
  query,
  lastReloadRequestTime,
  loading = false,
  error,
  hasData = true,
  schema,
}: HostKpiChartsProps) => {
  const charts = useHostKpiCharts({
    indexPattern: dataView?.getIndexPattern(),
    getSubtitle,
    schema,
  });

  if (!loading && (!hasData || error)) {
    return (
      <>
        {charts.map((_chartProps, index) => (
          <EuiFlexItem key={index}>
            <EuiPanel
              hasBorder
              borderRadius="m"
              hasShadow={false}
              paddingSize="m"
              css={css`
                min-height: ${KPI_CHART_HEIGHT}px;
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <ChartPlaceholder error={error} isEmpty={!hasData} />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </>
    );
  }

  return (
    <>
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            filters={filters}
            query={query}
            lastReloadRequestTime={lastReloadRequestTime}
            loading={loading}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};
