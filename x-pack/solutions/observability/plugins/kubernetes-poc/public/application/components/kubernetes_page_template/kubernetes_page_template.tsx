/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { KubernetesSearchBar } from '../kubernetes_search_bar';
import type { KubernetesSearchBarProps } from '../kubernetes_search_bar';

export interface KubernetesPageTemplateProps extends LazyObservabilityPageTemplateProps {
  /** Props to pass to the search bar */
  searchBarProps?: Omit<
    KubernetesSearchBarProps,
    'onQuerySubmit' | 'onRefresh' | 'onTimeRangeChange' | 'appliedTimeRange'
  >;
  /** Callback when search is submitted (Update button clicked) */
  onQuerySubmit?: (payload: { query?: Query; dateRange: TimeRange }) => void;
  /** Callback when refresh button is clicked */
  onRefresh?: (dateRange: TimeRange) => void;
  /** Callback when time range changes in the picker */
  onTimeRangeChange?: (dateRange: TimeRange) => void;
  /** Hide the search bar */
  hideSearchBar?: boolean;
  /** The currently applied time range (used to show Update vs Refresh button) */
  appliedTimeRange?: TimeRange;
}

/**
 * KubernetesPageTemplate wraps the ObservabilityPageTemplate and adds a
 * unified search bar with date picker at the top of every page.
 */
export const KubernetesPageTemplate: React.FC<KubernetesPageTemplateProps> = ({
  children,
  searchBarProps,
  onQuerySubmit,
  onRefresh,
  onTimeRangeChange,
  hideSearchBar = false,
  appliedTimeRange,
  ...pageTemplateProps
}) => {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate paddingSize="s" {...pageTemplateProps}>
      {!hideSearchBar && (
        <KubernetesSearchBar
          {...searchBarProps}
          onQuerySubmit={onQuerySubmit}
          onRefresh={onRefresh}
          onTimeRangeChange={onTimeRangeChange}
          appliedTimeRange={appliedTimeRange}
        />
      )}
      {children}
    </ObservabilityPageTemplate>
  );
};
