/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useRef } from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { OnboardingFlow } from '../../../components/shared/templates/no_data_config';
import { InfraPageTemplate } from '../../../components/shared/templates/infra_page_template';
import { WithMetricsExplorerOptionsUrlState } from '../../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { useMetricsExplorerViews } from '../../../hooks/use_metrics_explorer_views';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { NoData } from '../../../components/empty_states';
import { MetricsExplorerCharts } from './components/charts';
import { MetricsExplorerToolbar } from './components/toolbar';
import { useMetricsExplorerState } from './hooks/use_metric_explorer_state';
import { metricsExplorerTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { MetricsExplorerOptionsContainer } from './hooks/use_metrics_explorer_options';
import { MetricsInDiscoverCallout } from './components/metrics_in_discover_callout';

export const MetricsExplorerPage = () => {
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer' });
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: metricsExplorerTitle,
    },
  ]);

  return (
    <MetricsExplorerOptionsContainer>
      <WithMetricsExplorerOptionsUrlState />
      <MetricsExplorerContent />
    </MetricsExplorerOptionsContainer>
  );
};

const MetricsExplorerContent = () => {
  const [enabled, setEnabled] = useState(false);
  const {
    isLoading,
    error,
    data,
    timeRange,
    options,
    chartOptions,
    setChartOptions,
    handleAggregationChange,
    handleMetricsChange,
    handleFilterQuerySubmit,
    handleGroupByChange,
    handleTimeChange,
    handleLoadMore,
    onViewStateChange,
    refresh,
  } = useMetricsExplorerState({ enabled });
  const { currentView } = useMetricsExplorerViews();

  const prevDataRef = useRef(data);
  const { onPageReady } = usePerformanceContext();

  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer' });
  useTrackPageview({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 });

  useEffect(() => {
    if (currentView) {
      onViewStateChange(currentView);
    }
  }, [currentView, onViewStateChange]);

  useEffect(() => {
    if (currentView != null) {
      // load metrics explorer data after default view loaded, unless we're not isLoading a view
      setEnabled(true);
    }
  }, [currentView]);

  useMetricsBreadcrumbs([
    {
      text: metricsExplorerTitle,
    },
  ]);

  const viewState = {
    options,
    chartOptions,
    currentTimerange: timeRange,
  };

  useEffect(() => {
    if (!isLoading && data && prevDataRef.current !== data) {
      onPageReady({
        meta: {
          rangeFrom: timeRange.from,
          rangeTo: timeRange.to,
        },
      });

      prevDataRef.current = data;
    }
  }, [isLoading, data, timeRange.from, timeRange.to, onPageReady]);

  const onFilter = (query: string) => {
    handleFilterQuerySubmit({ query: { query, language: 'kuery' } });
  };

  return (
    <InfraPageTemplate
      onboardingFlow={OnboardingFlow.Infra}
      pageHeader={{
        pageTitle: metricsExplorerTitle,
        rightSideItems: [<SavedViews viewState={viewState} />],
      }}
    >
      <MetricsInDiscoverCallout timeRange={timeRange} />
      <MetricsExplorerToolbar
        timeRange={timeRange}
        options={options}
        chartOptions={chartOptions}
        onRefresh={refresh}
        onTimeChange={handleTimeChange}
        onGroupByChange={handleGroupByChange}
        onFilterQuerySubmit={handleFilterQuerySubmit}
        onMetricsChange={handleMetricsChange}
        onAggregationChange={handleAggregationChange}
        onChartOptionsChange={setChartOptions}
      />
      {error ? (
        <NoData
          titleText="Whoops!"
          bodyText={i18n.translate('xpack.infra.metricsExplorer.errorMessage', {
            defaultMessage: 'It looks like the request failed with "{message}"',
            values: { message: error.message },
          })}
          onRefetch={refresh}
          refetchText="Try Again"
        />
      ) : (
        <MetricsExplorerCharts
          timeRange={timeRange}
          isLoading={isLoading}
          data={data}
          options={options}
          chartOptions={chartOptions}
          onLoadMore={handleLoadMore}
          onFilter={onFilter}
          onRefetch={refresh}
          onTimeChange={handleTimeChange}
        />
      )}
    </InfraPageTemplate>
  );
};
