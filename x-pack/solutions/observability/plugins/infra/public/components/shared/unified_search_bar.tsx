/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SearchBarProps, StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { useMetricsDataViewContext } from '../../containers/metrics_source';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

export const UnifiedSearchBar = ({
  onQuerySubmit,
  showDatePicker = false,
  showSubmitButton = false,
  showFilterBar = false,
  showQueryMenu = false,
  useDefaultBehaviors = true,
  query,
  placeholder,
  showPlaceholder = true,
}: Pick<
  SearchBarProps,
  | 'onQuerySubmit'
  | 'showDatePicker'
  | 'showSubmitButton'
  | 'showFilterBar'
  | 'showQueryMenu'
  | 'query'
  | 'placeholder'
> &
  Pick<StatefulSearchBarProps, 'useDefaultBehaviors'> & { showPlaceholder?: boolean }) => {
  const { metricsView } = useMetricsDataViewContext();
  const {
    services: { unifiedSearch },
  } = useKibanaContextForPlugin();

  const { SearchBar } = unifiedSearch.ui;

  return (
    <SearchBar
      appName={'infra'}
      displayStyle="inPage"
      iconType="search"
      indexPatterns={metricsView && [metricsView.dataViewReference]}
      placeholder={
        showPlaceholder
          ? placeholder ??
            i18n.translate('xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder', {
              defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
            })
          : undefined
      }
      showSubmitButton={showSubmitButton}
      onQuerySubmit={onQuerySubmit}
      allowSavingQueries
      showDatePicker={showDatePicker}
      showFilterBar={showFilterBar}
      showQueryInput
      showQueryMenu={showQueryMenu}
      useDefaultBehaviors={useDefaultBehaviors}
      query={query}
      isAutoRefreshDisabled
      isRefreshPaused
    />
  );
};
