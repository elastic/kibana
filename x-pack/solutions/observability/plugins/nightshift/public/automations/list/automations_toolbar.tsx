/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React, { useState } from 'react';
import {
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import type { TimeRange } from '../hooks/use_automation_usage';
import {
  statusLabels,
  type AutomationFilters,
  type FilterOption,
} from '../utils/filter_automations';
import { getTriggerIcon } from '../utils/trigger_display';
import { AutomationFilter } from './automation_filter';
import { AutomationsTimeRangePicker } from './time_range_picker';
import { listLabels } from './translations';

const COLLAPSE_CREATE_BELOW_PX = 900;

export interface AutomationFilterOptions {
  statuses: FilterOption[];
  tags: FilterOption[];
  authors: FilterOption[];
  triggers: FilterOption[];
}

export const AutomationsToolbar = ({
  filters,
  options,
  hasFilterSelections,
  hasActiveFilters,
  visibleCount,
  totalCount,
  pageIndex,
  pageSize,
  onFilterChange,
  onClearFilters,
  onRangeChange,
  onRefresh,
  onCreate,
}: {
  filters: AutomationFilters;
  options: AutomationFilterOptions;
  hasFilterSelections: boolean;
  hasActiveFilters: boolean;
  visibleCount: number;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onFilterChange: <K extends keyof AutomationFilters>(key: K, value: AutomationFilters[K]) => void;
  onClearFilters: () => void;
  onRangeChange: (range: TimeRange, label: string) => void;
  onRefresh: () => void;
  onCreate?: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(toolbar);
  const isCompact = width > 0 && width < COLLAPSE_CREATE_BELOW_PX;
  const statusIcons: Record<string, React.ReactNode> = {
    [statusLabels.enabled]: <EuiIcon type="play" color="success" aria-hidden={true} />,
    [statusLabels.paused]: <EuiIcon type="pause" color="subdued" aria-hidden={true} />,
    [statusLabels.rateLimited]: (
      <EuiIcon
        type="hourglass"
        color={euiTheme.colors.vis.euiColorVisWarning0}
        aria-hidden={true}
      />
    ),
  };
  const from = pageIndex * pageSize + 1;
  const to = Math.min(visibleCount, (pageIndex + 1) * pageSize);
  const countText =
    visibleCount > pageSize
      ? i18n.translate('xpack.nightshift.automations.showingRangeCount', {
          defaultMessage: 'Showing {from}-{to} of {count} automations',
          values: { from, to, count: visibleCount },
        })
      : hasActiveFilters
      ? i18n.translate('xpack.nightshift.automations.showingFilteredCount', {
          defaultMessage: 'Showing {count} of {total} automations',
          values: { count: visibleCount, total: totalCount },
        })
      : i18n.translate('xpack.nightshift.automations.showingCount', {
          defaultMessage: 'Showing {count, plural, one {# automation} other {# automations}}',
          values: { count: visibleCount },
        });

  return (
    <>
      <div ref={setToolbar}>
        <EuiFlexGroup gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={true} css={css({ minWidth: 0 })}>
            <EuiFieldSearch
              compressed
              placeholder={listLabels.search}
              value={filters.search}
              onChange={(event) => onFilterChange('search', event.target.value)}
              isClearable
              fullWidth
              data-test-subj="automationsSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <AutomationFilter
                label={listLabels.status}
                ariaLabel={listLabels.filterByStatus}
                options={options.statuses.map((option) => ({
                  ...option,
                  prepend: statusIcons[option.label],
                }))}
                selected={filters.statuses}
                onChange={(statuses) => onFilterChange('statuses', statuses)}
                testSubject="automationStatusFilter"
              />
              <AutomationFilter
                label={listLabels.tag}
                ariaLabel={listLabels.filterByTags}
                emptyMessage={listLabels.noTagsYet}
                options={options.tags}
                searchPlaceholder={listLabels.findTag}
                selected={filters.tags}
                onChange={(tags) => onFilterChange('tags', tags)}
                testSubject="automationTagFilter"
              />
              <AutomationFilter
                label={listLabels.author}
                ariaLabel={listLabels.filterByAuthor}
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
                ariaLabel={listLabels.filterByTrigger}
                popoverWidth={280}
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
            <AutomationsTimeRangePicker onRangeChange={onRangeChange} onRefresh={onRefresh} />
          </EuiFlexItem>
          {onCreate && (
            <EuiFlexItem grow={false}>
              {isCompact ? (
                <EuiToolTip content={listLabels.create} disableScreenReaderOutput>
                  <EuiButtonIcon
                    display="fill"
                    iconType="plus"
                    aria-label={listLabels.create}
                    onClick={onCreate}
                    data-test-subj="nightshiftAutomationsPageButton"
                    {...getEbtProps({
                      action: NIGHTSHIFT_EBT_ACTIONS.CREATE_AUTOMATION,
                      element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
                    })}
                  />
                </EuiToolTip>
              ) : (
                <EuiButton
                  data-test-subj="nightshiftAutomationsPageButton"
                  fill
                  size="s"
                  iconType="plus"
                  onClick={onCreate}
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.CREATE_AUTOMATION,
                    element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
                  })}
                >
                  {listLabels.create}
                </EuiButton>
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
      {visibleCount > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {countText}
              </EuiText>
            </EuiFlexItem>
            {hasFilterSelections && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="nightshiftAutomationsPageButton"
                  size="xs"
                  onClick={onClearFilters}
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.CLEAR_AUTOMATION_FILTERS,
                    element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
                  })}
                >
                  {listLabels.clearFilters}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};
