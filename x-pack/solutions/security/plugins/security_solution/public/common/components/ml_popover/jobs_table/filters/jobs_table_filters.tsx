/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';

import {
  EuiButtonGroup,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiSearchBarQuery } from '../../../../../timelines/components/open_timeline/types';
import * as i18n from './translations';
import type { JobsFilters, SecurityJob } from '../../types';
import { GroupsFilterPopover } from './groups_filter_popover';

type PrebuiltJobsFilter = 'elastic' | 'custom';

interface JobsTableFiltersProps {
  securityJobs: SecurityJob[];
  onFilterChanged: Dispatch<SetStateAction<JobsFilters>>;
}

/**
 * Filters for the Pre-built jobs tab: search, groups, and Elastic / Custom button group.
 */
export const JobsTableFiltersComponent = ({
  securityJobs,
  onFilterChanged,
}: JobsTableFiltersProps) => {
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [prebuiltFilter, setPrebuiltFilter] = useState<PrebuiltJobsFilter>('elastic');

  const showElasticJobs = prebuiltFilter === 'elastic';
  const showCustomJobs = prebuiltFilter === 'custom';

  useEffect(() => {
    onFilterChanged((current) => ({
      ...current,
      filterQuery,
      showCustomJobs,
      showElasticJobs,
      selectedGroups,
    }));
  }, [filterQuery, selectedGroups, showCustomJobs, showElasticJobs, onFilterChanged]);

  const handleChange = useCallback(
    (query: EuiSearchBarQuery) => setFilterQuery(query.queryText.trim()),
    [setFilterQuery]
  );

  const prebuiltFilterOptions = useMemo(
    () => [
      {
        id: 'elastic',
        label: i18n.SHOW_ELASTIC_JOBS,
        'data-test-subj': 'show-elastic-jobs-filter-button',
      },
      {
        id: 'custom',
        label: i18n.SHOW_CUSTOM_JOBS,
        'data-test-subj': 'show-custom-jobs-filter-button',
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiSearchBar
            data-test-subj="jobs-filter-bar"
            box={{
              placeholder: i18n.FILTER_PLACEHOLDER,
              incremental: true,
              fullWidth: true,
            }}
            onChange={handleChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <GroupsFilterPopover
              securityJobs={securityJobs}
              onSelectedGroupsChanged={setSelectedGroups}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiButtonGroup
        legend={i18n.SHOW_PREBUILT_JOBS}
        options={prebuiltFilterOptions}
        idSelected={prebuiltFilter}
        onChange={(id) => setPrebuiltFilter(id as PrebuiltJobsFilter)}
        buttonSize="compressed"
        color="text"
        data-test-subj="prebuilt-jobs-filter-button-group"
      />
    </>
  );
};

JobsTableFiltersComponent.displayName = 'JobsTableFiltersComponent';

export const JobsTableFilters = React.memo(JobsTableFiltersComponent);

JobsTableFilters.displayName = 'JobsTableFilters';
