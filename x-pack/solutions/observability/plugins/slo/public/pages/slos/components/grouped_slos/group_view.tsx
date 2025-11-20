/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiFlexItem, EuiLoadingSpinner, EuiTablePagination } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import React, { useEffect, useState } from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchSloGroups } from '../../../../hooks/use_fetch_slo_groups';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import type { ViewType, GroupByField, SortDirection, SortField } from '../../types';
import { SloGroupListEmpty } from './group_list_empty';
import { SloGroupListError } from './group_list_error';
import { GroupListView } from './group_list_view';
import { SloOverviewDetails } from '../../../../embeddable/slo/common/slo_overview_details';
import { useCreateSloContext } from '../../../../embeddable/slo/overview/create_slo_context';

interface Props {
  groupBy: GroupByField;
  kqlQuery?: string;
  view: ViewType;
  sort?: SortField;
  direction?: SortDirection;
  filters?: Filter[];
  lastRefreshTime?: number;
  groupsFilter?: string[];
}

export function GroupView({
  kqlQuery,
  view,
  sort,
  direction,
  groupBy,
  groupsFilter,
  filters,
  lastRefreshTime,
}: Props) {
  const { state, onStateChange } = useUrlSearchState();
  const { tagsFilter, statusFilter, page, perPage, lastRefresh } = state;
  const [selectedSlo, setSelectedSlo] = useState<SLOWithSummaryResponse | null>(null);
  const { onViewSLO: onViewSLOContext } = useCreateSloContext();

  // Use context onViewSLO if available, otherwise use local state management
  const handleViewSLO = onViewSLOContext || ((slo: SLOWithSummaryResponse) => setSelectedSlo(slo));
  const { data, isLoading, isError, isRefetching, refetch } = useFetchSloGroups({
    perPage,
    page: page + 1,
    groupBy,
    kqlQuery,
    tagsFilter,
    statusFilter,
    filters,
    lastRefresh,
    groupsFilter,
  });

  useEffect(() => {
    refetch();
  }, [lastRefreshTime, refetch]);

  const { results = [], total = 0 } = data ?? {};
  const handlePageClick = (pageNumber: number) => {
    onStateChange({ page: pageNumber });
  };

  if (isLoading || isRefetching) {
    return (
      <EuiEmptyPrompt
        data-test-subj="sloGroupListLoading"
        title={<EuiLoadingSpinner size="xl" />}
      />
    );
  }

  if (!isLoading && !isError && results.length === 0) {
    return <SloGroupListEmpty />;
  }

  if (!isLoading && isError) {
    return <SloGroupListError />;
  }
  return (
    <EuiFlexItem data-test-subj="sloGroupView">
      {results &&
        results.map((result) => (
          <GroupListView
            groupBy={result.groupBy}
            key={result.group}
            view={view}
            group={result.group}
            kqlQuery={kqlQuery}
            sort={sort}
            direction={direction}
            summary={result.summary}
            filters={filters}
            onViewSLO={handleViewSLO}
          />
        ))}

      {total > 0 && total > perPage ? (
        <EuiFlexItem>
          <EuiTablePagination
            data-test-subj="sloGroupListPagination"
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={handlePageClick}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              onStateChange({ perPage: newPerPage, page: 0 });
            }}
          />
        </EuiFlexItem>
      ) : null}
      {/* Only render SloOverviewDetails if we're managing state locally (no context onViewSLO) */}
      {!onViewSLOContext && (
        <SloOverviewDetails slo={selectedSlo} setSelectedSlo={setSelectedSlo} />
      )}
    </EuiFlexItem>
  );
}
