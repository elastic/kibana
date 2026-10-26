/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperDatePicker,
  useEuiTheme,
} from '@elastic/eui';
import {
  MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH,
  SIGNIFICANT_EVENT_INVESTIGATION_STATES,
  type SignificantEventInvestigationState,
  type SignificantEventsFacets,
} from '@kbn/significant-events-plugin/common';
import {
  SEVERITY_OPTIONS,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  type Severity,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import React from 'react';
import {
  SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS,
  SIGNIFICANT_EVENT_STATUS_ICONS,
  SIGNIFICANT_EVENT_STATUS_LABELS,
} from '../../../components/entities/significant_event/significant_event_status';
import { FilterPopover } from '../../../components/ui/filter_popover';
import { SIGNIFICANT_EVENT_SEVERITY } from '../../../components/ui/severity_badge';
import type { DetectionTimeRange } from '../use_detection_time_range';
import {
  INVESTIGATION_LABEL,
  SEARCH_PLACEHOLDER,
  SEVERITY_LABEL,
  STATUS_LABEL,
} from './translations';

export interface EventsFiltersProps {
  timeRange: DetectionTimeRange;
  searchValue: string;
  status: SignificantEventStatus[];
  severity: Severity[];
  investigation: SignificantEventInvestigationState[];
  facets: SignificantEventsFacets | undefined;
  onTimeRangeChange: (timeRange: DetectionTimeRange) => void;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (status: SignificantEventStatus[]) => void;
  onSeverityChange: (severity: Severity[]) => void;
  onInvestigationChange: (investigation: SignificantEventInvestigationState[]) => void;
}

export const EventsFilters = ({
  timeRange,
  searchValue,
  status,
  severity,
  investigation,
  facets,
  onTimeRangeChange,
  onSearchChange,
  onStatusChange,
  onSeverityChange,
  onInvestigationChange,
}: EventsFiltersProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="nightshiftDetectionEventsSearch"
          compressed
          fullWidth
          isClearable
          maxLength={MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH}
          placeholder={SEARCH_PLACEHOLDER}
          aria-label={SEARCH_PLACEHOLDER}
          value={searchValue}
          onChange={onSearchChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          compressed
          width="auto"
          showUpdateButton={false}
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={({ start, end }) => onTimeRangeChange({ from: start, to: end })}
          data-test-subj="nightshiftDetectionEventsTimePicker"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <FilterPopover
            label={SEVERITY_LABEL}
            options={SEVERITY_OPTIONS}
            selected={severity}
            counts={facets?.severity}
            getLabel={(value) => SIGNIFICANT_EVENT_SEVERITY[value].label}
            getPrepend={(value) => (
              <EuiIcon
                type="dot"
                color={euiTheme.colors.severity[SIGNIFICANT_EVENT_SEVERITY[value].color]}
                aria-hidden={true}
              />
            )}
            onChange={onSeverityChange}
            testSubject="nightshiftDetectionEventsSeverityFilter"
          />
          <FilterPopover
            label={STATUS_LABEL}
            options={SIGNIFICANT_EVENT_STATUS_OPTIONS}
            selected={status}
            counts={facets?.status}
            getLabel={(value) => SIGNIFICANT_EVENT_STATUS_LABELS[value]}
            getPrepend={(value) => (
              <EuiIcon
                type={SIGNIFICANT_EVENT_STATUS_ICONS[value].iconType}
                color={SIGNIFICANT_EVENT_STATUS_ICONS[value].color}
                aria-hidden={true}
              />
            )}
            onChange={onStatusChange}
            testSubject="nightshiftDetectionEventsStatusFilter"
          />
          <FilterPopover
            label={INVESTIGATION_LABEL}
            options={SIGNIFICANT_EVENT_INVESTIGATION_STATES}
            selected={investigation}
            counts={facets?.investigation}
            getLabel={(value) => SIGNIFICANT_EVENT_INVESTIGATION_STATE_LABELS[value]}
            onChange={onInvestigationChange}
            testSubject="nightshiftDetectionEventsInvestigationFilter"
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
