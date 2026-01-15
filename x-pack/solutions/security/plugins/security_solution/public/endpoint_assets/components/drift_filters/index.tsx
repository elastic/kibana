/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiButtonIcon,
  EuiText,
} from '@elastic/eui';
import type { DriftCategory, DriftSeverity } from '../../../../common/endpoint_assets';
import { DriftCategoryFilter } from './drift_category_filter';
import { DriftSeverityFilter } from './drift_severity_filter';
import { DriftTimeRangeFilter } from './drift_time_range_filter';
import { DriftHostFilter } from './drift_host_filter';
import type { HostOption } from './drift_host_filter';
import * as i18n from '../../pages/translations';

export interface DriftFiltersProps {
  selectedCategories: DriftCategory[];
  selectedSeverities: DriftSeverity[];
  selectedTimeRange: string;
  selectedHostId: string;
  availableHosts: HostOption[];
  onCategoryChange: (categories: DriftCategory[]) => void;
  onSeverityChange: (severities: DriftSeverity[]) => void;
  onTimeRangeChange: (timeRange: string) => void;
  onHostChange: (hostId: string) => void;
  onRefresh: () => void;
  isLoadingHosts?: boolean;
}

const DriftFiltersComponent: React.FC<DriftFiltersProps> = ({
  selectedCategories,
  selectedSeverities,
  selectedTimeRange,
  selectedHostId,
  availableHosts,
  onCategoryChange,
  onSeverityChange,
  onTimeRangeChange,
  onHostChange,
  onRefresh,
  isLoadingHosts = false,
}) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <strong>Time range:</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DriftTimeRangeFilter
          selectedTimeRange={selectedTimeRange}
          onTimeRangeChange={onTimeRangeChange}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <DriftCategoryFilter
            selectedCategories={selectedCategories}
            onSelectionChange={onCategoryChange}
          />
          <DriftSeverityFilter
            selectedSeverities={selectedSeverities}
            onSelectionChange={onSeverityChange}
          />
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <strong>{i18n.DRIFT_FILTER_HOST}:</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DriftHostFilter
          availableHosts={availableHosts}
          selectedHostId={selectedHostId}
          onHostChange={onHostChange}
          isLoading={isLoadingHosts}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="drift-refresh-button"
          iconType="refresh"
          onClick={onRefresh}
          aria-label={i18n.REFRESH}
          display="base"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const DriftFilters = React.memo(DriftFiltersComponent);
DriftFilters.displayName = 'DriftFilters';
