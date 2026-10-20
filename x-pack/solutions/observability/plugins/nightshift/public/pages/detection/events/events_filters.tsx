/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import {
  getSeverityLabel,
  SEVERITY_OPTIONS,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  type Severity,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import React, { useState } from 'react';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../../../components/entities/significant_event/significant_event_status';
import { useKibana } from '../../../hooks/use_kibana';
import type { DetectionTimeRange } from '../use_detection_time_range';
import { SEARCH_PLACEHOLDER, SEVERITY_FILTER_LABEL, STATUS_FILTER_LABEL } from './translations';

interface EventsFilterPopoverProps<Value extends string> {
  label: string;
  options: readonly Value[];
  selected: Value[];
  getLabel: (value: Value) => string;
  onChange: (selected: Value[]) => void;
  testSubject: string;
}

const EventsFilterPopover = <Value extends string>({
  label,
  options,
  selected,
  getLabel,
  onChange,
  testSubject,
}: EventsFilterPopoverProps<Value>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={label}
      button={
        <EuiFilterButton
          data-test-subj={`${testSubject}Button`}
          iconType="chevronSingleDown"
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          onClick={() => setIsOpen((current) => !current)}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <EuiFilterSelectItem
            key={option}
            checked={isSelected ? 'on' : undefined}
            data-test-subj={`${testSubject}Option-${option}`}
            onClick={() =>
              onChange(
                isSelected
                  ? selected.filter((selectedOption) => selectedOption !== option)
                  : [...selected, option]
              )
            }
          >
            {getLabel(option)}
          </EuiFilterSelectItem>
        );
      })}
    </EuiPopover>
  );
};

export interface EventsFiltersProps {
  timeRange: DetectionTimeRange;
  searchValue: string;
  status: SignificantEventStatus[];
  severity: Severity[];
  onTimeRangeChange: (timeRange: DetectionTimeRange) => void;
  onRefresh: () => void;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (status: SignificantEventStatus[]) => void;
  onSeverityChange: (severity: Severity[]) => void;
}

export const EventsFilters = ({
  timeRange,
  searchValue,
  status,
  severity,
  onTimeRangeChange,
  onRefresh,
  onSearchChange,
  onStatusChange,
  onSeverityChange,
}: EventsFiltersProps): React.ReactElement => {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="nightshiftDetectionEventsSearch"
          fullWidth
          maxLength={500}
          placeholder={SEARCH_PLACEHOLDER}
          value={searchValue}
          onChange={onSearchChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EventsFilterPopover
            label={STATUS_FILTER_LABEL}
            options={SIGNIFICANT_EVENT_STATUS_OPTIONS}
            selected={status}
            getLabel={(value) => SIGNIFICANT_EVENT_STATUS_LABELS[value]}
            onChange={onStatusChange}
            testSubject="nightshiftDetectionEventsStatusFilter"
          />
          <EventsFilterPopover
            label={SEVERITY_FILTER_LABEL}
            options={SEVERITY_OPTIONS}
            selected={severity}
            getLabel={getSeverityLabel}
            onChange={onSeverityChange}
            testSubject="nightshiftDetectionEventsSeverityFilter"
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SearchBar
          appName="nightshift"
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          disableQueryLanguageSwitcher
          disableSubscribingToGlobalDataServices
          displayStyle="inPage"
          enableDateRangePicker
          isAutoRefreshDisabled
          onQuerySubmit={({ dateRange }, isUpdate) => {
            if (dateRange) {
              onTimeRangeChange(dateRange);
            }
            if (!isUpdate) {
              onRefresh();
            }
          }}
          query={undefined}
          showDatePicker
          showFilterBar={false}
          showQueryInput={false}
          showQueryMenu={false}
          showTimeWindowButtons
          submitButtonStyle="iconOnly"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
