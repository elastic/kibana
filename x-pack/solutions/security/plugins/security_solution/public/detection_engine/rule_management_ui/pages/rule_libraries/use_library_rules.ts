/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchRuleLibraryTagsQuery } from '../../../rule_management/api/hooks/prebuilt_rules/use_fetch_rule_library_tags_query';
import { useBrowseRuleLibraryQuery } from '../../../rule_management/api/hooks/prebuilt_rules/use_browse_rule_library_query';
import { toLibraryRuleRow } from './map_rule_library';
import { DEFAULT_PAGE_STATE } from './rule_libraries_url_state';
import type { RuleLibrariesPageState } from './rule_libraries_url_state';
import type { LibraryRuleRow, LibraryRulesSort } from './types';

export interface LibraryRulesState {
  rules: readonly LibraryRuleRow[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  // A rule needs to have all of the tags.
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  // The tags the rules of the library use, to choose from.
  availableTags: string[];
  // MITRE ATT&CK tactic ids. A rule needs to have any of them.
  tactics: string[];
  onTacticsChange: (tactics: string[]) => void;
  pagination: { pageIndex: number; pageSize: number };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  sort?: LibraryRulesSort;
  onSortChange: (sort?: LibraryRulesSort) => void;
}

interface UseLibraryRulesParams {
  // Omit to browse every library.
  libraryId?: string;
  enabled: boolean;
  // Where to start, for example what the URL asked for.
  initialState?: Pick<
    RuleLibrariesPageState,
    'search' | 'tags' | 'tactics' | 'pageIndex' | 'pageSize'
  >;
}

export const useLibraryRules = ({
  libraryId,
  enabled,
  initialState = DEFAULT_PAGE_STATE,
}: UseLibraryRulesParams) => {
  const [query, setQuery] = useState(initialState.search);
  const [tags, setTags] = useState<string[]>(initialState.tags);
  const [tactics, setTactics] = useState<string[]>(initialState.tactics);
  const [pagination, setPagination] = useState({
    pageIndex: initialState.pageIndex,
    pageSize: initialState.pageSize,
  });
  const [sort, setSort] = useState<LibraryRulesSort>();

  const { data, isLoading, isError } = useBrowseRuleLibraryQuery(
    {
      library_id: libraryId,
      search: query || undefined,
      tags: tags.length > 0 ? tags : undefined,
      tactics: tactics.length > 0 ? tactics : undefined,
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
      sort: sort
        ? [
            {
              field: sort.field === 'riskScore' ? 'risk_score' : sort.field,
              order: sort.direction,
            },
          ]
        : undefined,
    },
    { enabled, keepPreviousData: true }
  );

  // A page that no longer exists, for example from an old link or after a filter, is replaced by the last one.
  useEffect(() => {
    if (data && data.rules.length === 0 && data.total > 0 && pagination.pageIndex > 0) {
      setPagination((current) => ({
        ...current,
        pageIndex: Math.max(0, Math.ceil(data.total / current.pageSize) - 1),
      }));
    }
  }, [data, pagination.pageIndex]);

  const rules = useMemo(() => (data?.rules ?? []).map(toLibraryRuleRow), [data]);

  const onQueryChange = useCallback(
    (nextQuery: string) => {
      if (nextQuery === query) return;
      setQuery(nextQuery);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    [query]
  );

  const { data: tagsData } = useFetchRuleLibraryTagsQuery(libraryId, { enabled });

  const onTagsChange = useCallback((nextTags: string[]) => {
    setTags(nextTags);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const onTacticsChange = useCallback((nextTactics: string[]) => {
    setTactics(nextTactics);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  // Called when another library is selected, so the new one starts on its first page with no search or filter.
  const reset = useCallback(() => {
    setQuery('');
    setTags([]);
    setTactics([]);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const state: LibraryRulesState = {
    rules,
    total: data?.total ?? 0,
    isLoading: enabled && isLoading,
    isError,
    query,
    onQueryChange,
    tags,
    onTagsChange,
    availableTags: tagsData?.tags ?? [],
    tactics,
    onTacticsChange,
    pagination,
    onPaginationChange: setPagination,
    sort,
    onSortChange: setSort,
  };

  return { state, reset };
};
