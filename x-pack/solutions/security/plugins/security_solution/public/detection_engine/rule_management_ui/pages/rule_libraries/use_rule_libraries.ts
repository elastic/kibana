/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useCreateRuleLibraryMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_create_rule_library_mutation';
import { useFetchRuleLibrariesQuery } from '../../../rule_management/api/hooks/prebuilt_rules/use_fetch_rule_libraries_query';
import { useRefreshRuleLibrariesMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_refresh_rule_libraries_mutation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { toRuleLibraryListItem } from './map_rule_library';
import { toCreateLibraryRequest } from './to_library_connection';
import type { NewRuleLibraryInput } from './types';
import * as i18n from './translations';

const POLL_WHILE_REFRESHING_MS = 3000;

export const useRuleLibraries = () => {
  const { addError } = useAppToasts();
  const { data, isLoading, isError } = useFetchRuleLibrariesQuery({
    refetchInterval: (response) =>
      response?.libraries.some(({ refresh_status: status }) => status === 'refreshing')
        ? POLL_WHILE_REFRESHING_MS
        : false,
  });
  const {
    mutate: refresh,
    isLoading: isRefreshing,
    variables,
  } = useRefreshRuleLibrariesMutation({
    onError: (error) => addError(error, { title: i18n.REFRESH_ERROR_TITLE }),
  });
  const { mutateAsync: create, isLoading: isCreating } = useCreateRuleLibraryMutation({
    onError: (error) => addError(error, { title: i18n.CREATE_ERROR_TITLE }),
  });

  const libraries = useMemo(() => {
    const items = (data?.libraries ?? []).map(toRuleLibraryListItem);
    const refreshingIds = new Set(
      isRefreshing ? variables?.libraryIds ?? items.map(({ id }) => id) : []
    );
    return items.map((library) =>
      refreshingIds.has(library.id) ? { ...library, refreshStatus: 'refreshing' as const } : library
    );
  }, [data, isRefreshing, variables]);

  const refreshLibraries = useCallback(
    (libraryIds?: string[]) => refresh({ libraryIds }),
    [refresh]
  );

  // Creates the library and starts its first refresh, which reads its manifest and its rules.
  // Resolves to the new id, or to nothing when it could not be created.
  const createLibrary = useCallback(
    async (input: NewRuleLibraryInput): Promise<string | undefined> => {
      try {
        const { id } = await create(toCreateLibraryRequest(input));
        refresh({ libraryIds: [id] });
        return id;
      } catch {
        // The failure is already reported by the mutation.
        return undefined;
      }
    },
    [create, refresh]
  );

  return { libraries, isLoading, isError, isCreating, refreshLibraries, createLibrary };
};
