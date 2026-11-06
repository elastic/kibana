/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type {
  OverviewFilterName,
  OverviewFilterOptions,
} from '../../../../../common/overview_filters';
import { OVERVIEW_FILTER_NAMES } from '../../../../../common/overview_filters';
import { FacetFilter } from '../../../../components/facet_filter';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import type { Formatters } from '../../../../hooks/use_formatters';
import type { useOverviewFilters } from '../../../../hooks/use_overview_filters';

const FILTER_LABELS: Record<OverviewFilterName, string> = {
  browser: i18n.translate('xpack.digitalExperience.overview.filters.browserLabel', {
    defaultMessage: 'Browser',
  }),
  os: i18n.translate('xpack.digitalExperience.overview.filters.osLabel', {
    defaultMessage: 'OS',
  }),
  device: i18n.translate('xpack.digitalExperience.overview.filters.deviceLabel', {
    defaultMessage: 'Device',
  }),
  country: i18n.translate('xpack.digitalExperience.overview.filters.countryLabel', {
    defaultMessage: 'Country',
  }),
  pageUrl: i18n.translate('xpack.digitalExperience.overview.filters.pageLabel', {
    defaultMessage: 'Page',
  }),
};

const FILTER_EBT_ELEMENTS: Record<OverviewFilterName, string> = {
  browser: APPLICATION_OVERVIEW_EBT_ELEMENTS.BROWSER_FILTER,
  os: APPLICATION_OVERVIEW_EBT_ELEMENTS.OS_FILTER,
  device: APPLICATION_OVERVIEW_EBT_ELEMENTS.DEVICE_FILTER,
  country: APPLICATION_OVERVIEW_EBT_ELEMENTS.COUNTRY_FILTER,
  pageUrl: APPLICATION_OVERVIEW_EBT_ELEMENTS.PAGE_FILTER,
};

/**
 * The filters to show: those with values to pick from, and those with a selection, so a value from
 * a link stays visible and removable. A filter nothing reports values for, e.g. the country
 * without GeoIP processing in the collector, stays hidden.
 */
export const visibleFilters = (
  options: OverviewFilterOptions | undefined,
  selected: Partial<Record<OverviewFilterName, string>>
): OverviewFilterName[] =>
  // Until the first Overview loads there is nothing to tell, so every filter shows as loading.
  OVERVIEW_FILTER_NAMES.filter(
    (name) => !options || options[name].length > 0 || selected[name] !== undefined
  );

/**
 * The buttons of the Overview's filters, to put in the `EuiFilterGroup` of the environment picker,
 * and the button that clears them.
 */
export function OverviewFilterButtons({
  options,
  filters,
  setFilter,
  isLoading,
  formatters,
}: {
  options: OverviewFilterOptions | undefined;
  filters: ReturnType<typeof useOverviewFilters>['filters'];
  setFilter: ReturnType<typeof useOverviewFilters>['setFilter'];
  isLoading: boolean;
  formatters: Pick<Formatters, 'formatNumber'>;
}) {
  return (
    <>
      {visibleFilters(options, filters).map((name) => (
        <FacetFilter
          key={name}
          data-test-subj={`digitalExperienceOverviewFilter-${name}`}
          ebtElement={FILTER_EBT_ELEMENTS[name]}
          label={FILTER_LABELS[name]}
          buckets={options?.[name] ?? []}
          selected={filters[name]}
          onChange={(value) => setFilter(name, value)}
          formatters={formatters}
          isLoading={isLoading && !options}
        />
      ))}
    </>
  );
}

export function ClearOverviewFilters({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  if (!hasActiveFilters) {
    return null;
  }
  return (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj="digitalExperienceOverviewClearFilters"
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
          element: APPLICATION_OVERVIEW_EBT_ELEMENTS.CLEAR_FILTERS,
        })}
        size="s"
        iconType="cross"
        onClick={onClear}
      >
        {i18n.translate('xpack.digitalExperience.overview.filters.clearButtonLabel', {
          defaultMessage: 'Clear filters',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
}
