/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { FindCompositeSLOResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDeleteCompositeSlo } from '../../../hooks/use_delete_composite_slo';
import { useRefreshCompositeSloSummaries } from '../../../hooks/use_refresh_composite_slo_summaries';
import { useFetchCompositeHistoricalSummary } from '../../../hooks/use_fetch_composite_historical_summary';
import { useFetchCompositeSloDetails } from '../../../hooks/use_fetch_composite_slo_details';
import {
  useFetchCompositeSloList,
  type CompositeSloSortBy,
  type CompositeSloSortDirection,
} from '../../../hooks/use_fetch_composite_slo_list';
import { useFetchCompositeSloSuggestions } from '../../../hooks/use_fetch_composite_slo_suggestions';
import { CompositeSloDeleteModal } from './composite_slo_delete_modal';
import { CompositeSloTable } from './composite_slo_table';
import { CompositeSloToolbar } from './composite_slo_toolbar';

type CompositeSLOItem = FindCompositeSLOResponse['results'][number];

export function CompositeSloList() {
  useRefreshCompositeSloSummaries();
  const { mutateAsync: deleteCompositeSlo } = useDeleteCompositeSlo();

  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [deleteConfirm, setDeleteConfirm] = useState<CompositeSLOItem | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<CompositeSloSortBy>('createdAt');
  const [sortDirection, setSortDirection] = useState<CompositeSloSortDirection>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTagSelection = useCallback((options: EuiSelectableOption[]) => {
    const newTags = options.filter((opt) => opt.checked === 'on').map((opt) => opt.label);
    setSelectedTags(newTags);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((statuses: string[]) => {
    setSelectedStatuses(statuses);
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setSortBy('createdAt');
    setSortDirection('desc');
    setSelectedTags([]);
    setSelectedStatuses([]);
    setPage(0);
  }, []);

  const tagsParam = selectedTags.length > 0 ? selectedTags.join(',') : undefined;
  const statusParam = selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined;

  const { data, isInitialLoading, isLoading, isError } = useFetchCompositeSloList({
    page: page + 1,
    perPage,
    search: debouncedSearch || undefined,
    tags: tagsParam,
    status: statusParam,
    sortBy,
    sortDirection,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;

  const { suggestions } = useFetchCompositeSloSuggestions();
  const availableTags = useMemo(
    () => suggestions?.tags?.map((t) => t.label).sort() ?? [],
    [suggestions]
  );

  const hasActiveFilters =
    debouncedSearch !== '' || selectedTags.length > 0 || selectedStatuses.length > 0;

  const compositeIds = useMemo(
    () => data?.results?.map((item: CompositeSLOItem) => item.id) ?? [],
    [data?.results]
  );
  const { detailsById, isLoading: isDetailsLoading } = useFetchCompositeSloDetails(compositeIds);
  const { historicalSummaryById, isLoading: isHistoricalLoading } =
    useFetchCompositeHistoricalSummary(compositeIds);

  const handleSortChange = useCallback(
    (newSortBy: CompositeSloSortBy, newDirection: CompositeSloSortDirection) => {
      setSortBy(newSortBy);
      setSortDirection(newDirection);
    },
    []
  );

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
        availableTags={availableTags}
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
          total={total}
          page={page}
          perPage={perPage}
          sortBy={sortBy}
          sortDirection={sortDirection}
          isDetailsLoading={isDetailsLoading}
          isHistoricalLoading={isHistoricalLoading}
          detailsById={detailsById}
          historicalSummaryById={historicalSummaryById}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          onSortChange={handleSortChange}
          onDelete={setDeleteConfirm}
        />
      )}
      {deleteConfirm && (
        <CompositeSloDeleteModal
          name={deleteConfirm.name}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={async () => {
            await deleteCompositeSlo({ id: deleteConfirm.id, name: deleteConfirm.name });
            setDeleteConfirm(null);
          }}
        />
      )}
    </>
  );
}
