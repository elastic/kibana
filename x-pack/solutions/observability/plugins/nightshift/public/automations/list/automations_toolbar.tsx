/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '../hooks/use_automation_usage';
import type { AutomationFilters, FilterOption } from '../utils/filter_automations';
import { getTriggerIcon } from '../utils/trigger_display';
import { AutomationFilter } from './automation_filter';
import { listLabels } from './translations';

export interface AutomationFilterOptions {
  statuses: FilterOption[];
  tags: FilterOption[];
  authors: FilterOption[];
  triggers: FilterOption[];
}

export const AutomationsToolbar = ({
  filters,
  options,
  hasFilters,
  visibleCount,
  totalCount,
  range,
  onFilterChange,
  onClearFilters,
  onRangeChange,
  onCreate,
}: {
  filters: AutomationFilters;
  options: AutomationFilterOptions;
  hasFilters: boolean;
  visibleCount: number;
  totalCount: number;
  range: TimeRange;
  onFilterChange: <K extends keyof AutomationFilters>(key: K, value: AutomationFilters[K]) => void;
  onClearFilters: () => void;
  onRangeChange: (range: TimeRange) => void;
  onCreate?: () => void;
}) => (
  <>
    <EuiFlexGroup gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={true} css={css({ minWidth: 240 })}>
        <EuiFieldSearch
          placeholder={listLabels.search}
          value={filters.search}
          onChange={(event) => onFilterChange('search', event.target.value)}
          isClearable
          fullWidth
          data-test-subj="automationsSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <AutomationFilter
            label={listLabels.status}
            options={options.statuses}
            selected={filters.statuses}
            onChange={(statuses) => onFilterChange('statuses', statuses)}
            testSubject="automationStatusFilter"
          />
          <AutomationFilter
            label={listLabels.tag}
            options={options.tags}
            searchPlaceholder={listLabels.findTag}
            selected={filters.tags}
            onChange={(tags) => onFilterChange('tags', tags)}
            testSubject="automationTagFilter"
          />
          <AutomationFilter
            label={listLabels.author}
            options={options.authors.map((option) => ({
              ...option,
              prepend: <EuiAvatar size="s" name={option.label} />,
            }))}
            searchPlaceholder={listLabels.findAuthor}
            selected={filters.authors}
            onChange={(authors) => onFilterChange('authors', authors)}
            testSubject="automationAuthorFilter"
          />
          <AutomationFilter
            label={listLabels.trigger}
            options={options.triggers.map((option) => ({
              ...option,
              prepend: <EuiIcon type={getTriggerIcon(option.label)} aria-hidden={true} />,
            }))}
            selected={filters.triggers}
            onChange={(triggers) => onFilterChange('triggers', triggers)}
            testSubject="automationTriggerFilter"
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={range.start}
          end={range.end}
          showUpdateButton={false}
          width="auto"
          commonlyUsedRanges={[
            { start: 'now-48h', end: 'now', label: listLabels.last48Hours },
            { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
            { start: 'now-7d', end: 'now', label: 'Last 7 days' },
            { start: 'now-30d', end: 'now', label: 'Last 30 days' },
          ]}
          onTimeChange={({ start, end }) => onRangeChange({ start, end })}
          onRefresh={({ start, end }) => onRangeChange({ start, end })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {onCreate && (
          <EuiButton
            data-test-subj="nightshiftAutomationsPageButton"
            fill
            iconType="plus"
            onClick={onCreate}
          >
            {listLabels.create}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {hasFilters
            ? i18n.translate('xpack.nightshift.automations.showingFilteredCount', {
                defaultMessage: 'Showing {count} of {total} automations',
                values: { count: visibleCount, total: totalCount },
              })
            : i18n.translate('xpack.nightshift.automations.showingCount', {
                defaultMessage: 'Showing {count} automations',
                values: { count: visibleCount },
              })}
        </EuiText>
      </EuiFlexItem>
      {hasFilters && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="nightshiftAutomationsPageButton"
            size="xs"
            onClick={onClearFilters}
          >
            {listLabels.clearFilters}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
  </>
);
