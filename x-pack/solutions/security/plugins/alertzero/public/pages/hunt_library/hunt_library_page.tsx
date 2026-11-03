/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { useHuntLibrary } from '../../hooks/use_hunt_library_api';
import {
  ALERTZERO_UI_EVENTS,
  useAlertZeroTelemetry,
  useReportHuntLibraryOpened,
} from '../../telemetry';
import { WatchesSectionLayout } from '../watches/components/watches_section_layout';
import {
  ALL_PLATFORMS,
  DEFAULT_FILTERS,
  filterHunts,
  isFiltering,
  platformsOf,
  type AvailabilityFilter,
  type HuntFilters,
} from './filter_hunts';
import { HuntDetailFlyout } from './hunt_detail_flyout';
import { HuntLibraryTable } from './hunt_library_table';
import { HUNT_LIBRARY_SECTION_ID } from './paths';
import * as i18n from './translations';

const HUNT_QUERY_PARAM = 'hunt';

export const HuntLibraryPage: React.FC = () => {
  const history = useHistory();
  const { search: locationSearch } = useLocation();
  const { data, isLoading, isError, refetch } = useHuntLibrary();
  const [filters, setFilters] = useState<HuntFilters>(DEFAULT_FILTERS);
  const { reportEvent } = useAlertZeroTelemetry();

  // A filter is reported when it is set, not when it is cleared; search reports when text first
  // appears, so typing a phrase is one event.
  const updateFilters = useCallback(
    (next: HuntFilters) => {
      const filterEvent = (filterType: 'search' | 'platform' | 'availability') =>
        reportEvent(ALERTZERO_UI_EVENTS.HuntLibraryFiltered, { filter_type: filterType });
      if (filters.search.trim() === '' && next.search.trim() !== '') filterEvent('search');
      if (next.platform !== filters.platform && next.platform !== ALL_PLATFORMS) {
        filterEvent('platform');
      }
      if (next.availability !== filters.availability && next.availability !== 'all') {
        filterEvent('availability');
      }
      setFilters(next);
    },
    [filters, reportEvent]
  );

  // The open hunt lives in the URL so a flyout can be linked and survives a reload.
  const selectedHuntId = new URLSearchParams(locationSearch).get(HUNT_QUERY_PARAM) ?? undefined;
  const selectHunt = useCallback(
    (huntId: string | undefined) => {
      const params = new URLSearchParams(history.location.search);
      if (huntId) params.set(HUNT_QUERY_PARAM, huntId);
      else params.delete(HUNT_QUERY_PARAM);
      const query = params.toString();
      history.push({ pathname: history.location.pathname, search: query ? `?${query}` : '' });
    },
    [history]
  );

  const hunts = useMemo(() => data?.hunts ?? [], [data]);
  useReportHuntLibraryOpened({
    huntCount: data ? hunts.length : undefined,
    availableHuntCount: hunts.filter(({ availability }) => availability.available).length,
  });
  const platforms = useMemo(() => platformsOf(hunts), [hunts]);
  const visible = useMemo(() => filterHunts(hunts, filters), [hunts, filters]);

  const body = (() => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (isError) {
      return (
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
          body={<p>{i18n.LOAD_ERROR_BODY}</p>}
          actions={
            <EuiButton onClick={() => refetch()} data-test-subj="alertZeroHuntLibraryRetry">
              {i18n.RETRY}
            </EuiButton>
          }
          data-test-subj="alertZeroHuntLibraryError"
        />
      );
    }
    if (visible.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="magnify"
          title={<h2>{i18n.NO_RESULTS_TITLE}</h2>}
          body={<p>{i18n.NO_RESULTS_BODY}</p>}
          actions={
            isFiltering(filters) ? (
              <EuiButton
                onClick={() => setFilters(DEFAULT_FILTERS)}
                data-test-subj="alertZeroHuntLibraryClearFilters"
              >
                {i18n.CLEAR_FILTERS}
              </EuiButton>
            ) : undefined
          }
          data-test-subj="alertZeroHuntLibraryNoResults"
        />
      );
    }
    return (
      <HuntLibraryTable
        hunts={visible}
        onSelect={selectHunt}
        getHref={(huntId) =>
          history.createHref({
            pathname: history.location.pathname,
            search: `?${HUNT_QUERY_PARAM}=${encodeURIComponent(huntId)}`,
          })
        }
      />
    );
  })();

  return (
    <WatchesSectionLayout active={HUNT_LIBRARY_SECTION_ID} title={i18n.PAGE_TITLE}>
      <div data-test-subj="alertZeroHuntLibraryPage">
        <EuiText size="s" color="subdued">
          <p>{i18n.PAGE_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive wrap>
          <EuiFlexItem grow={3}>
            <EuiFieldSearch
              fullWidth
              incremental
              placeholder={i18n.SEARCH_PLACEHOLDER}
              aria-label={i18n.SEARCH_ARIA_LABEL}
              value={filters.search}
              onChange={(event) => updateFilters({ ...filters, search: event.target.value })}
              data-test-subj="alertZeroHuntLibrarySearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiSelect
              fullWidth
              aria-label={i18n.PLATFORM_FILTER_LABEL}
              prepend={i18n.PLATFORM_FILTER_LABEL}
              value={filters.platform}
              options={[
                { value: ALL_PLATFORMS, text: i18n.FILTER_ALL },
                ...platforms.map((platform) => ({ value: platform, text: platform })),
              ]}
              onChange={(event) => updateFilters({ ...filters, platform: event.target.value })}
              data-test-subj="alertZeroHuntLibraryPlatformFilter"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiSelect
              fullWidth
              aria-label={i18n.AVAILABILITY_FILTER_LABEL}
              prepend={i18n.AVAILABILITY_FILTER_LABEL}
              value={filters.availability}
              options={[
                { value: 'all', text: i18n.FILTER_ALL },
                { value: 'available', text: i18n.FILTER_AVAILABLE },
                { value: 'unavailable', text: i18n.FILTER_UNAVAILABLE },
              ]}
              onChange={(event) =>
                updateFilters({
                  ...filters,
                  availability: event.target.value as AvailabilityFilter,
                })
              }
              data-test-subj="alertZeroHuntLibraryAvailabilityFilter"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {body}
        {selectedHuntId ? (
          <HuntDetailFlyout huntId={selectedHuntId} onClose={() => selectHunt(undefined)} />
        ) : null}
      </div>
    </WatchesSectionLayout>
  );
};
