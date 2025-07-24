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
import { usePluginConfig } from '../../../../../containers/plugin_config_context';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { ControlsContent } from './controls_content';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import { LimitOptions } from './limit_options';
import type { HostLimitOptions } from '../../types';
import { SchemaSelector } from '../../../../../components/schema_selector';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_time_range_metadata';
import { isPending } from '../../../../../hooks/use_fetcher';
import { METRIC_SCHEMA_SEMCONV } from '../../../../../../common/constants';
import type { SchemaTypes } from '../../../../../../common/http_api/shared/schema_type';

export const UnifiedSearchBar = () => {
  const {
    services: { unifiedSearch },
  } = useKibanaContextForPlugin();
  const { featureFlags } = usePluginConfig();
  const { metricsView } = useMetricsDataViewContext();
  const { searchCriteria, onLimitChange, onPanelFiltersChange, onSubmit, onPreferredSchemaChange } =
    useUnifiedSearchContext();
  const { onPageRefreshStart } = usePerformanceContext();

  const { SearchBar } = unifiedSearch.ui;

  const { data: timeRangeMetadata, status } = useTimeRangeMetadataContext();

  const schemas: SchemaTypes[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata]
  );

  // Set preferredSchema in URL if not set and hostOtelEnabled
  useEffect(() => {
    if (!timeRangeMetadata || schemas.length === 0 || !featureFlags.hostOtelEnabled) return;
    const current = searchCriteria.preferredSchema;

    if (current === null) {
      const next = schemas.includes(METRIC_SCHEMA_SEMCONV) ? METRIC_SCHEMA_SEMCONV : schemas[0];
      onPreferredSchemaChange(next);
    }
  }, [
    timeRangeMetadata,
    searchCriteria.preferredSchema,
    onPreferredSchemaChange,
    schemas,
    featureFlags.hostOtelEnabled,
  ]);

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

  const isLoading = isPending(status);

  return (
    <StickyContainer>
      <EuiFlexGroup direction="column" gutterSize="s">
        {featureFlags.hostOtelEnabled && (
          <EuiFlexItem>
            <SchemaSelector
              onChange={onPreferredSchemaChange}
              schemas={schemas}
              value={searchCriteria.preferredSchema}
              isLoading={isLoading}
            />
          </EuiFlexItem>
        )}
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
