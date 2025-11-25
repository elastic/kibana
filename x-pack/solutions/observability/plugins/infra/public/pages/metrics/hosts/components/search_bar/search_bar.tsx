/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useEuiTheme, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { i18n } from '@kbn/i18n';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';
import { UnifiedSearchBar } from '../../../../../components/shared/unified_search_bar';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { ControlsContent } from './controls_content';
import { LimitOptions } from './limit_options';
import type { HostLimitOptions } from '../../types';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_time_range_metadata';

export const SearchBar = () => {
  const { searchCriteria, onLimitChange, onPanelFiltersChange, onSubmit, onPreferredSchemaChange } =
    useUnifiedSearchContext();
  const { onPageRefreshStart } = usePerformanceContext();
  const { metricsView } = useMetricsDataViewContext();
  const { data: timeRangeMetadata } = useTimeRangeMetadataContext();

  const schemas: DataSchemaFormat[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata?.schemas]
  );

  // Set preferredSchema in URL if not set
  useEffect(() => {
    if (!timeRangeMetadata || schemas.length === 0) return;
    const current = searchCriteria.preferredSchema;

    if (current === null) {
      onPreferredSchemaChange(timeRangeMetadata.preferredSchema);
    }
  }, [timeRangeMetadata, searchCriteria.preferredSchema, onPreferredSchemaChange, schemas]);

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
          <UnifiedSearchBar
            onQuerySubmit={handleRefresh}
            placeholder={
              searchCriteria.preferredSchema === 'ecs'
                ? i18n.translate('xpack.infra.hosts.searchPlaceholder', {
                    defaultMessage:
                      'Search hosts (E.g. cloud.provider:gcp AND system.load.1 > 0.5)',
                  })
                : i18n.translate('xpack.infra.hosts.otelSearchPlaceholder', {
                    defaultMessage: 'Search hosts (E.g. cloud.provider:gcp AND os.type:linux)',
                  })
            }
            showDatePicker
            showFilterBar
            showSubmitButton
            showQueryMenu
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
                schema={searchCriteria.preferredSchema}
                schemas={schemas}
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
