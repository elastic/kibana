/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useEuiTheme, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { ControlsContent } from './controls_content';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import { LimitOptions } from './limit_options';
import type { HostLimitOptions } from '../../types';
import { SchemaSelector } from '../../../../../components/schema_selector';
import { useTimeRangeMetadata } from '../../../../../hooks/use_time_range_metadata';
import type { HostsState } from '../../hooks/use_unified_search_url_state';
import { useHostsUrlState } from '../../hooks/use_unified_search_url_state';

export const UnifiedSearchBar = () => {
  const {
    services: { unifiedSearch },
  } = useKibanaContextForPlugin();
  const { metricsView } = useMetricsDataViewContext();
  const {
    searchCriteria,
    onLimitChange,
    onPanelFiltersChange,
    onSubmit,
    onPreferredSchemaChange,
    parsedDateRange,
  } = useUnifiedSearchContext();
  const { onPageRefreshStart } = usePerformanceContext();

  const { data: timeRangeMetadata } = useTimeRangeMetadata({
    dataSource: 'host',
    start: parsedDateRange.from,
    end: parsedDateRange.to,
  });

  const { SearchBar } = unifiedSearch.ui;

  // const { data: timeRangeMetadata } = useTimeRangeMetadataContext();
  const [hostsState, setHostsState] = useHostsUrlState();

  const schemas = useMemo(() => timeRangeMetadata?.schemas || [], [timeRangeMetadata]);

  // Set preferredSchema in URL if not set or not available
  useEffect(() => {
    if (!schemas.length) return;
    const current = hostsState.preferredSchema;
    if (!current || !schemas.includes(current)) {
      const next = schemas.includes('semconv') ? 'semconv' : schemas[0];
      setHostsState({
        ...hostsState,
        preferredSchema: next,
        type: 'SET_PREFERRED_SCHEMA',
      });
    }
  }, [schemas, hostsState, setHostsState]);

  console.log('UnifiedSearchBar searchCriteria:', searchCriteria.preferredSchema);

  const handleSchemaChange = useCallback(
    (selected: HostsState['preferredSchema']) => {
      setHostsState({
        ...hostsState,
        preferredSchema: selected,
        type: 'SET_PREFERRED_SCHEMA',
      });
      console.log('UnifiedSearchBar handleSchemaChange:', selected);
      if (onPreferredSchemaChange) {
        onPreferredSchemaChange(selected);
      }
    },
    [hostsState, setHostsState, onPreferredSchemaChange]
  );

  // Prepare options for SchemaSelector
  const schemaOptions = useMemo(
    () =>
      schemas.map((schema) => ({
        text: schema,
        value: schema,
      })),
    [schemas]
  );
  const handleRefresh = useCallback(
    (payload: { dateRange: TimeRange }, isUpdate?: boolean) => {
      // This makes sure `onSubmit` is only called when the submit button is clicked
      if (isUpdate === false) {
        onSubmit(payload);
        onPageRefreshStart();
      }
    },
    [onSubmit, onPageRefreshStart]
  );

  return (
    <StickyContainer>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <SchemaSelector
            onChange={handleSchemaChange}
            options={schemaOptions}
            value={hostsState.preferredSchema}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <SearchBar
            appName={'Infra Hosts'}
            displayStyle="inPage"
            indexPatterns={metricsView && [metricsView.dataViewReference]}
            placeholder={i18n.translate('xpack.infra.hosts.searchPlaceholder', {
              defaultMessage: 'Search hosts (E.g. cloud.provider:gcp AND system.load.1 > 0.5)',
            })}
            onQuerySubmit={handleRefresh}
            allowSavingQueries
            showDatePicker
            showFilterBar
            showQueryInput
            showQueryMenu
            useDefaultBehaviors
            isAutoRefreshDisabled
            isRefreshPaused
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center" wrap={false} gutterSize="s">
            <EuiFlexItem>
              <ControlsContent
                timeRange={searchCriteria.dateRange}
                dataView={metricsView?.dataViewReference}
                query={searchCriteria.query}
                filters={searchCriteria.filters}
                onFiltersChange={onPanelFiltersChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LimitOptions
                limit={searchCriteria.limit as HostLimitOptions}
                onChange={onLimitChange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule
        margin="xs"
        css={css`
          margin-bottom: 0;
        `}
      />
    </StickyContainer>
  );
};

const StickyContainer = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: sticky;
        top: var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0));
        z-index: ${euiTheme.levels.navigation};
        background: ${euiTheme.colors.emptyShade};
        padding: ${euiTheme.size.l} ${euiTheme.size.l} 0px;
        margin: -${euiTheme.size.l} -${euiTheme.size.l} 0px;
        min-height: calc(${euiTheme.size.xxxl} * 2);
      `}
    >
      {children}
    </div>
  );
};
