/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import type { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useDeleteCompositeSlo } from '../../../../hooks/use_delete_composite_slo';
import {
  useFetchCompositeSloList,
  type CompositeSloSortBy,
  type CompositeSloSortDirection,
} from '../../../../hooks/use_fetch_composite_slo_list';
import { useRefreshCompositeSloSummaries } from '../../../../hooks/use_refresh_composite_slo_summaries';
import { CompositeSloDeleteModal } from './composite_slo_delete_modal';
import { CompositeSloTable } from './composite_slo_table';
import { CompositeSloToolbar } from './composite_slo_toolbar';

type CompositeSLOItem = CompositeSLOWithSummaryResponse;

export function CompositeSloList() {
  useRefreshCompositeSloSummaries();
  const { mutate: deleteCompositeSlo } = useDeleteCompositeSlo();

  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [deleteConfirm, setDeleteConfirm] = useState<CompositeSLOItem | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<CompositeSloSortBy>('createdAt');
  const [sortDirection, setSortDirection] = useState<CompositeSloSortDirection>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useDebounce(() => setDebouncedSearch(search), 300, [search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleTagSelection = (options: EuiSelectableOption[]) => {
    const newTags = options.filter((opt) => opt.checked === 'on').map((opt) => opt.label);
    setSelectedTags(newTags);
    setPage(0);
  };

  const handleStatusChange = (statuses: string[]) => {
    setSelectedStatuses(statuses);
    setPage(0);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSortBy('createdAt');
    setSortDirection('desc');
    setSelectedTags([]);
    setSelectedStatuses([]);
    setPage(0);
  };

  const { data, isInitialLoading, isLoading, isError } = useFetchCompositeSloList({
    page: page + 1,
    perPage,
    search: debouncedSearch || undefined,
    tags: selectedTags,
    status: selectedStatuses,
    sortBy,
    sortDirection,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;

  const hasActiveFilters =
    debouncedSearch !== '' || selectedTags.length > 0 || selectedStatuses.length > 0;

  const handleSortChange = (
    newSortBy: CompositeSloSortBy,
    newDirection: CompositeSloSortDirection
  ) => {
    setSortBy(newSortBy);
    setSortDirection(newDirection);
  };

  if (isError) {
    return (
      <EuiText color="danger">
        {i18n.translate('xpack.slo.compositeSloList.errorMessage', {
          defaultMessage: 'Unable to load composite SLOs',
        })}
      </EuiText>
    );
  }

  return (
    <>
      <CompositeSloToolbar
        search={search}
        isLoading={isLoading}
        selectedTags={selectedTags}
        selectedStatuses={selectedStatuses}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onTagSelectionChange={handleTagSelection}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
      />
      <EuiSpacer size="m" />
      {isInitialLoading ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <CompositeSloTable
          results={results}
          pagination={{ pageIndex: page, pageSize: perPage, totalItemCount: total }}
          sort={{ field: sortBy, direction: sortDirection }}
          onPageChange={(pageIndex, pageSize) => {
            setPage(pageIndex);
            setPerPage(pageSize);
          }}
          onSortChange={handleSortChange}
          onDelete={setDeleteConfirm}
        />
      )}
      {deleteConfirm && (
        <CompositeSloDeleteModal
          name={deleteConfirm.name}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => {
            deleteCompositeSlo(
              { id: deleteConfirm.id, name: deleteConfirm.name },
              {
                onSettled: () => {
                  setDeleteConfirm(null);
                },
              }
            );
          }}
        />
      )}
    </>
  );
}
