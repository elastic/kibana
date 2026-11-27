/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiButtonEmpty, EuiFilterButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { FilterValue } from '../../../../../common/filter_values';
import type {
  OverviewFilterName,
  OverviewFilterOptions,
  OverviewFilters,
} from '../../../../../common/overview_filters';
import { OVERVIEW_FILTER_NAMES } from '../../../../../common/overview_filters';
import { filterPillText, MultiFacetFilter } from '../../../../components/multi_facet_filter';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import type { Formatters } from '../../../../hooks/use_formatters';
import { FILTER_EBT_ELEMENTS, FILTER_LABELS } from './overview_filter_labels';
import { SavedViewsMenu } from './saved_views_menu';

/** The filters that have a button of their own; the others are in the "All filters" flyout. */
export const PINNED_FILTER_NAMES: readonly OverviewFilterName[] = [
  'browser',
  'os',
  'appVersion',
  'country',
  'pageUrl',
];

/**
 * The pinned filters to show: those with values to pick from, and those with a selection, so a
 * value from a link stays visible and removable. A filter nothing reports values for, e.g. the
 * country without GeoIP processing in the collector, stays hidden.
 */
export const visibleFilters = (
  options: OverviewFilterOptions | undefined,
  filters: OverviewFilters
): OverviewFilterName[] =>
  // Until the first Overview loads there is nothing to tell, so every filter shows as loading.
  PINNED_FILTER_NAMES.filter(
    (name) => !options || options[name].length > 0 || (filters[name] ?? []).length > 0
  );

/**
 * The `count` filters of `names` to give a button, so the row can keep to one line: those with a
 * selection first, then the others in order of importance. Whatever is left out stays in the pills
 * below the row, the count of "All filters" and the flyout. They come back in the order of `names`.
 */
export const limitFilters = (
  names: readonly OverviewFilterName[],
  filters: OverviewFilters,
  count: number
): OverviewFilterName[] => {
  const isSelected = (name: OverviewFilterName) => (filters[name] ?? []).length > 0;
  const kept = new Set(
    [...names.filter(isSelected), ...names.filter((name) => !isSelected(name))].slice(
      0,
      Math.max(0, count)
    )
  );
  return names.filter((name) => kept.has(name));
};

/** How many values the filters select in all, included and excluded. */
export const countSelectedValues = (filters: OverviewFilters): number =>
  OVERVIEW_FILTER_NAMES.reduce((total, name) => total + (filters[name] ?? []).length, 0);

/**
 * The buttons of the Overview's filters, to put in the `EuiFilterGroup` of the environment picker:
 * the pinned filters of `names`, and the one that opens all of them.
 */
export function OverviewFilterButtons({
  names,
  options,
  filters,
  setFilter,
  onOpenAllFilters,
  isLoading,
  formatters,
}: {
  /** The filters to give a button, e.g. from `visibleFilters` and `limitFilters`. */
  names: readonly OverviewFilterName[];
  options: OverviewFilterOptions | undefined;
  filters: OverviewFilters;
  setFilter: (name: OverviewFilterName, values: FilterValue[]) => void;
  onOpenAllFilters: () => void;
  isLoading: boolean;
  formatters: Pick<Formatters, 'formatNumber'>;
}) {
  const selectedCount = countSelectedValues(filters);

  return (
    <>
      {names.map((name) => (
        <MultiFacetFilter
          key={name}
          data-test-subj={`digitalExperienceOverviewFilter-${name}`}
          ebtElement={FILTER_EBT_ELEMENTS[name]}
          label={FILTER_LABELS[name]}
          buckets={options?.[name] ?? []}
          values={filters[name] ?? []}
          onChange={(values) => setFilter(name, values)}
          formatters={formatters}
          isLoading={isLoading && !options}
        />
      ))}
      <EuiFilterButton
        data-test-subj="digitalExperienceOverviewAllFilters"
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_FILTER,
          element: APPLICATION_OVERVIEW_EBT_ELEMENTS.ALL_FILTERS,
        })}
        iconType="controls"
        hasActiveFilters={selectedCount > 0}
        numActiveFilters={selectedCount > 0 ? selectedCount : undefined}
        onClick={onOpenAllFilters}
      >
        {i18n.translate('xpack.digitalExperience.overview.filters.allFiltersLabel', {
          defaultMessage: 'All filters',
        })}
      </EuiFilterButton>
      <SavedViewsMenu />
    </>
  );
}

/** The values of one filter shown on a pill: all included, or all excluded. */
export interface FilterPillGroup {
  name: OverviewFilterName;
  exclude: boolean;
  values: string[];
}

/** How many values a pill lists before it ends in how many more there are. */
export const PILL_VALUES_SHOWN = 3;

/**
 * The pills for `filters`: one per filter for its included values and one for its excluded values,
 * so a filter with many values takes one pill, and an exclusion, which drops data, stays apart.
 * With `isSplit`, one pill per value, for where nothing else lets a single value be removed.
 */
export const groupFilterPills = (filters: OverviewFilters, isSplit = false): FilterPillGroup[] =>
  OVERVIEW_FILTER_NAMES.flatMap((name) =>
    [false, true].flatMap((exclude) => {
      const values = (filters[name] ?? [])
        .filter((item) => item.exclude === exclude)
        .map(({ value }) => value);
      if (isSplit) {
        return values.map((value) => ({ name, exclude, values: [value] }));
      }
      return values.length > 0 ? [{ name, exclude, values }] : [];
    })
  );

const pillTextCss = css({
  display: 'flex',
  minInlineSize: 0,
  gap: '0.25em',
});
const pillPreviewCss = css({
  minInlineSize: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/**
 * The values the filters select, as one pill per filter (and one more for its exclusions) that
 * removes those values, and the button that clears all the filters. Nothing shows while no filter
 * has a value. With `isSplit`, each value has a pill of its own.
 */
export function OverviewFilterPills({
  filters,
  setFilter,
  onClear,
  isSplit = false,
}: {
  filters: OverviewFilters;
  setFilter: (name: OverviewFilterName, values: FilterValue[]) => void;
  onClear: () => void;
  isSplit?: boolean;
}) {
  const pills = groupFilterPills(filters, isSplit);
  if (pills.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="digitalExperienceOverviewPills"
    >
      {pills.map(({ name, exclude, values }) => {
        const label = FILTER_LABELS[name];
        const fullText = filterPillText({ label, values, exclude });
        const preview = filterPillText({
          label,
          values: values.slice(0, PILL_VALUES_SHOWN),
          exclude,
        });
        const hidden = values.length - PILL_VALUES_SHOWN;
        const testSubj = isSplit ? `${name}-${values[0]}` : `${name}${exclude ? '-excluded' : ''}`;
        return (
          <EuiFlexItem grow={false} key={testSubj}>
            <EuiBadge
              color={exclude ? 'danger' : 'hollow'}
              iconType="cross"
              iconSide="right"
              iconOnClick={() =>
                setFilter(
                  name,
                  (filters[name] ?? []).filter(
                    (item) => item.exclude !== exclude || !values.includes(item.value)
                  )
                )
              }
              iconOnClickAriaLabel={i18n.translate(
                'xpack.digitalExperience.overview.filters.removePillLabel',
                { defaultMessage: 'Remove {filter}', values: { filter: fullText } }
              )}
              title={fullText}
              css={css({ maxInlineSize: '28em' })}
              data-test-subj={`digitalExperienceOverviewPill-${testSubj}`}
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                element: FILTER_EBT_ELEMENTS[name],
              })}
            >
              {/* The preview gives way to a long value, never the count of the others. */}
              <span css={pillTextCss}>
                <span css={pillPreviewCss}>{preview}</span>
                {hidden > 0 && (
                  <span css={{ flexShrink: 0 }} data-test-subj="digitalExperienceOverviewPillMore">
                    {`+${hidden}`}
                  </span>
                )}
              </span>
            </EuiBadge>
          </EuiFlexItem>
        );
      })}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="digitalExperienceOverviewClearFilters"
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
            element: APPLICATION_OVERVIEW_EBT_ELEMENTS.CLEAR_FILTERS,
          })}
          size="xs"
          iconType="cross"
          onClick={onClear}
        >
          {i18n.translate('xpack.digitalExperience.overview.filters.clearButtonLabel', {
            defaultMessage: 'Clear filters',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
