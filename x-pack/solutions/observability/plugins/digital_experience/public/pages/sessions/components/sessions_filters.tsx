/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { FacetBucket, SessionListFacets } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { Formatters } from '../../../hooks/use_formatters';
import { SingleSelectFilter } from '../../../components/single_select_filter';
import type { SessionsListState } from '../hooks/use_sessions_list_query';
import { DURATION_BUCKETS, type SessionsListUrlQuery } from '../../../utils/sessions_list_query';

export const SEARCH_DEBOUNCE_MS = 300;

/** The "any value" option of a facet, which removes its filter. */
const ANY_VALUE = '';

const ANY_LABEL = i18n.translate('xpack.digitalExperience.sessions.filters.anyLabel', {
  defaultMessage: 'Any',
});

type FacetParam = 'browser' | 'os' | 'country' | 'entryPage';

const FACETS: ReadonlyArray<{
  param: FacetParam;
  facet: keyof SessionListFacets;
  label: string;
  ebtElement: string;
}> = [
  {
    param: 'browser',
    facet: 'browsers',
    label: i18n.translate('xpack.digitalExperience.sessions.filters.browserLabel', {
      defaultMessage: 'Browser',
    }),
    ebtElement: SESSIONS_EBT_ELEMENTS.BROWSER_FILTER,
  },
  {
    param: 'os',
    facet: 'os',
    label: i18n.translate('xpack.digitalExperience.sessions.filters.osLabel', {
      defaultMessage: 'OS',
    }),
    ebtElement: SESSIONS_EBT_ELEMENTS.OS_FILTER,
  },
  {
    param: 'country',
    facet: 'countries',
    label: i18n.translate('xpack.digitalExperience.sessions.filters.countryLabel', {
      defaultMessage: 'Country',
    }),
    ebtElement: SESSIONS_EBT_ELEMENTS.COUNTRY_FILTER,
  },
  {
    param: 'entryPage',
    facet: 'entryPages',
    label: i18n.translate('xpack.digitalExperience.sessions.filters.entryPageLabel', {
      defaultMessage: 'Entry page',
    }),
    ebtElement: SESSIONS_EBT_ELEMENTS.ENTRY_PAGE_FILTER,
  },
];

/** The facet's values with their session counts; a selection outside the top values stays listed. */
export const facetOptions = (
  buckets: FacetBucket[],
  selected: string | undefined,
  { formatNumber }: Pick<Formatters, 'formatNumber'>
) => {
  const options = buckets.map(({ key, count }) => ({
    value: key,
    label: `${key} (${formatNumber(count)})`,
  }));
  const withSelected =
    selected && !buckets.some(({ key }) => key === selected)
      ? [{ value: selected, label: selected }, ...options]
      : options;
  return [{ value: ANY_VALUE, label: ANY_LABEL }, ...withSelected];
};

export function SessionsFilters({
  state,
  facets,
  sessionsWithErrors,
  hasActiveFilters,
  isLoading,
  formatters,
  onChange,
  onSearch,
  onClear,
}: {
  state: SessionsListState;
  facets: SessionListFacets | undefined;
  /** Shown on the errors filter, so users see how many sessions it keeps. */
  sessionsWithErrors: number | undefined;
  hasActiveFilters: boolean;
  isLoading: boolean;
  formatters: Formatters;
  onChange: (patch: Partial<Record<keyof SessionsListUrlQuery, string | undefined>>) => void;
  onSearch: (search: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState(state.search ?? '');

  // Follows the URL, e.g. when the filters are cleared or the user goes back; a search the URL
  // already has, but with spaces still being typed around it, stays as typed.
  useEffect(
    () =>
      setSearch((current) =>
        current.trim() === (state.search ?? '') ? current : state.search ?? ''
      ),
    [state.search]
  );

  useDebounce(
    () => {
      if (search.trim() !== (state.search ?? '')) {
        onSearch(search);
      }
    },
    SEARCH_DEBOUNCE_MS,
    [search]
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem css={{ minWidth: 240 }}>
        <EuiFieldSearch
          data-test-subj="digitalExperienceSessionsSearch"
          fullWidth
          placeholder={i18n.translate(
            'xpack.digitalExperience.sessions.filters.searchPlaceholder',
            { defaultMessage: 'Search by session ID, user, page, browser, OS or location' }
          )}
          aria-label={i18n.translate('xpack.digitalExperience.sessions.filters.searchAriaLabel', {
            defaultMessage: 'Search sessions',
          })}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          // Enter searches at once, without waiting for the debounce.
          onSearch={(value) => onSearch(value)}
          isClearable
          isLoading={isLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            data-test-subj="digitalExperienceSessionsErrorsFilter"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
              element: SESSIONS_EBT_ELEMENTS.ERRORS_FILTER,
            })}
            withNext
            hasActiveFilters={state.hasErrors}
            numFilters={sessionsWithErrors}
            onClick={() => onChange({ hasErrors: state.hasErrors ? undefined : 'true' })}
          >
            {i18n.translate('xpack.digitalExperience.sessions.filters.hasErrorsLabel', {
              defaultMessage: 'Has errors',
            })}
          </EuiFilterButton>
          <SingleSelectFilter
            data-test-subj="digitalExperienceSessionsDurationFilter"
            ebtElement={SESSIONS_EBT_ELEMENTS.DURATION_FILTER}
            label={i18n.translate('xpack.digitalExperience.sessions.filters.durationLabel', {
              defaultMessage: 'Duration',
            })}
            options={[
              { value: ANY_VALUE, label: ANY_LABEL },
              ...DURATION_BUCKETS.map(({ id, label }) => ({ value: id, label })),
            ]}
            selected={state.duration ?? ANY_VALUE}
            isActive={state.duration !== undefined}
            onChange={(value) => onChange({ duration: value || undefined })}
          />
          {FACETS.map(({ param, facet, label, ebtElement }) => (
            <SingleSelectFilter
              key={param}
              data-test-subj={`digitalExperienceSessionsFacet-${param}`}
              ebtElement={ebtElement}
              label={label}
              options={facetOptions(facets?.[facet] ?? [], state[param], formatters)}
              selected={state[param] ?? ANY_VALUE}
              isActive={state[param] !== undefined}
              onChange={(value) => onChange({ [param]: value || undefined })}
              searchable
              isLoading={isLoading && !facets}
            />
          ))}
        </EuiFilterGroup>
      </EuiFlexItem>
      {hasActiveFilters && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="digitalExperienceSessionsClearFilters"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
              element: SESSIONS_EBT_ELEMENTS.CLEAR_FILTERS,
            })}
            size="s"
            iconType="cross"
            onClick={onClear}
          >
            {i18n.translate('xpack.digitalExperience.sessions.filters.clearButtonLabel', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
