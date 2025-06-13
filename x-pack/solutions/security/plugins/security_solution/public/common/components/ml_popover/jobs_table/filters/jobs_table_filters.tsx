/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { useEffect, useState, useCallback } from 'react';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
} from '@elastic/eui';
import type { EuiSearchBarQuery } from '../../../../../timelines/components/open_timeline/types';
import * as i18n from './translations';
import type { JobsFilters, SecurityJob } from '../../types';
import { GroupsFilterPopover } from './groups_filter_popover';

interface JobsTableFiltersProps {
  defaultFilters: JobsFilters;
  securityJobs: SecurityJob[];
  onFilterChanged: Dispatch<SetStateAction<JobsFilters>>;
  hideSearchBar: boolean;
  hideGroupsFilter: boolean;
  hideElasticAndCustomJobsFilter: boolean;
}

/**
 * Collection of filters for filtering data within the JobsTable. Contains search bar, Elastic/Custom
 * Jobs filter button toggle, and groups selection
 *
 * @param defaultFilters the filters that are set on this component by default
 * @param securityJobs jobs to fetch groups from to display for filtering
 * @param onFilterChanged change listener to be notified on filter changes
 * @param hideSearchBar whether to hide the search bar at the top of the popover
 * @param hideGroupsFilter whether to hide the groups filter at the top of the popover
 * @param hideElasticAndCustomJobsFilter whether to hide the filters for "Elastic Jobs" and "Custom Jobs" at the top of the popover
 */
export const JobsTableFiltersComponent = ({
  defaultFilters,
  securityJobs,
  onFilterChanged,
  hideSearchBar,
  hideGroupsFilter,
  hideElasticAndCustomJobsFilter,
}: JobsTableFiltersProps) => {
  const [filterQuery, setFilterQuery] = useState<string>(defaultFilters.filterQuery);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(defaultFilters.selectedGroups);
  const [showCustomJobs, setShowCustomJobs] = useState<boolean>(defaultFilters.showCustomJobs);
  const [showElasticJobs, setShowElasticJobs] = useState<boolean>(defaultFilters.showElasticJobs);

  // Propagate filter changes to parent
  useEffect(() => {
    onFilterChanged({ filterQuery, showCustomJobs, showElasticJobs, selectedGroups });
  }, [filterQuery, selectedGroups, showCustomJobs, showElasticJobs, onFilterChanged]);

  const handleChange = useCallback(
    (query: EuiSearchBarQuery) => setFilterQuery(query.queryText.trim()),
    [setFilterQuery]
  );

  const handleElasticJobsClick = useCallback(() => {
    setShowElasticJobs(!showElasticJobs);
    setShowCustomJobs(false);
  }, [setShowElasticJobs, showElasticJobs, setShowCustomJobs]);

  const handleCustomJobsClick = useCallback(() => {
    setShowCustomJobs(!showCustomJobs);
    setShowElasticJobs(false);
  }, [setShowElasticJobs, showCustomJobs, setShowCustomJobs]);

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      {!hideSearchBar && (
        <EuiFlexItem grow={true}>
          <EuiSearchBar
            data-test-subj="jobs-filter-bar"
            box={{
              placeholder: i18n.FILTER_PLACEHOLDER,
              incremental: true,
            }}
            onChange={handleChange}
          />
        </EuiFlexItem>
      )}

      {!hideGroupsFilter && (
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <GroupsFilterPopover
              defaultFilters={defaultFilters}
              securityJobs={securityJobs}
              onSelectedGroupsChanged={setSelectedGroups}
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      )}

      {!hideElasticAndCustomJobsFilter && (
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              isToggle
              isSelected={showElasticJobs}
              hasActiveFilters={showElasticJobs}
              onClick={handleElasticJobsClick}
              data-test-subj="show-elastic-jobs-filter-button"
              withNext
            >
              {i18n.SHOW_ELASTIC_JOBS}
            </EuiFilterButton>
            <EuiFilterButton
              isToggle
              isSelected={showCustomJobs}
              hasActiveFilters={showCustomJobs}
              onClick={handleCustomJobsClick}
              data-test-subj="show-custom-jobs-filter-button"
            >
              {i18n.SHOW_CUSTOM_JOBS}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

JobsTableFiltersComponent.displayName = 'JobsTableFiltersComponent';

export const JobsTableFilters = React.memo(JobsTableFiltersComponent);

JobsTableFilters.displayName = 'JobsTableFilters';
