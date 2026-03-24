/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiFieldSearch,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/utils/build_episodes_esql_query';
import type { TimeRange } from '@kbn/es-query';
import { StatusFilter } from '@kbn/alerting-v2-episodes-ui/components/status_filter';
import { RuleFilter } from '@kbn/alerting-v2-episodes-ui/components/rule_filter';
import type { HttpStart } from '@kbn/core-http-browser';

export interface EpisodesFilterBarProps {
  filterState: EpisodesFilterState;
  onFilterChange: (state: EpisodesFilterState) => void;
  timeRange: TimeRange;
  onTimeChange: (range: TimeRange) => void;
  ruleOptions: Array<{ label: string; value: string }>;
  onRefresh?: () => void;
  isLoading?: boolean;
  services: { http: HttpStart };
}

export function EpisodesFilterBar({
  filterState,
  onFilterChange,
  timeRange,
  onTimeChange,
  ruleOptions,
  onRefresh,
  isLoading = false,
  services,
}: EpisodesFilterBarProps) {
  const onStatusChange = useCallback(
    (status: string | undefined) => {
      onFilterChange({
        ...filterState,
        status,
      });
    },
    [filterState, onFilterChange]
  );

  const onRuleChange = useCallback(
    (ruleId: string | undefined) => {
      onFilterChange({
        ...filterState,
        ruleId,
      });
    },
    [filterState, onFilterChange]
  );

  const onKueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.trim() || null;
      onFilterChange({ ...filterState, kuery: v ?? undefined });
    },
    [filterState, onFilterChange]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
      {/* Search */}
      <EuiFlexItem grow>
        <EuiFieldSearch
          fullWidth
          compressed
          placeholder={i18n.translate('xpack.observability.alertsV2.filterBar.searchPlaceholder', {
            defaultMessage: 'Search episodes…',
          })}
          value={filterState.kuery ?? ''}
          onChange={onKueryChange}
          data-test-subj="episodesFilterBar-search"
        />
      </EuiFlexItem>

      {/* Filters: Status, Rule */}
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <StatusFilter
            selectedStatus={filterState.status}
            onStatusChange={onStatusChange}
            data-test-subj="episodesFilterBar-status"
          />

          <RuleFilter
            selectedRuleId={filterState.ruleId}
            onRuleChange={onRuleChange}
            ruleOptions={ruleOptions}
            data-test-subj="episodesFilterBar-rule"
            services={services}
          />
        </EuiFilterGroup>
      </EuiFlexItem>

      {/* Time picker + refresh button */}
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          compressed
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={({ start, end }) => onTimeChange({ from: start, to: end })}
          onRefresh={onRefresh}
          isLoading={isLoading}
          showUpdateButton="iconOnly"
          width="auto"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
