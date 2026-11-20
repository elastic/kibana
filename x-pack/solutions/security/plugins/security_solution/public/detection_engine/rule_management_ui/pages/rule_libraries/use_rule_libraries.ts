/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useCreateRuleLibraryMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_create_rule_library_mutation';
import { useDeleteRuleLibraryMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_delete_rule_library_mutation';
import { useFetchRuleLibrariesQuery } from '../../../rule_management/api/hooks/prebuilt_rules/use_fetch_rule_libraries_query';
import { useSyncRuleLibrariesMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_sync_rule_libraries_mutation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { toRuleLibraryListItem } from './map_rule_library';
import { toCreateLibraryRequest } from './to_library_connection';
import type { NewRuleLibraryInput } from './types';
import * as i18n from './translations';

const POLL_WHILE_SYNCING_MS = 3000;

export const useRuleLibraries = () => {
  const { addError } = useAppToasts();
  const {
    mutate: sync,
    isLoading: isSyncing,
    variables,
  } = useSyncRuleLibrariesMutation({
    onError: (error) => addError(error, { title: i18n.SYNC_ERROR_TITLE }),
  });
  // The sync request lasts as long as the sync, so the list is read while it runs, which is how progress
  // gets here. Reading only once the list says a library is syncing would start too late.
  const { data, isLoading, isError } = useFetchRuleLibrariesQuery({
    refetchInterval: (response) =>
      isSyncing || response?.libraries.some(({ sync_status: status }) => status === 'syncing')
        ? POLL_WHILE_SYNCING_MS
        : false,
  });
  const { mutateAsync: create, isLoading: isCreating } = useCreateRuleLibraryMutation({
    onError: (error) => addError(error, { title: i18n.CREATE_ERROR_TITLE }),
  });

  const { mutateAsync: remove, isLoading: isRemoving } = useDeleteRuleLibraryMutation({
    onError: (error) => addError(error, { title: i18n.REMOVE_ERROR_TITLE }),
  });

  const libraries = useMemo(() => {
    const items = (data?.libraries ?? []).map(toRuleLibraryListItem);
    const syncingIds = new Set(isSyncing ? variables?.libraryIds ?? items.map(({ id }) => id) : []);
    return items.map((library) =>
      syncingIds.has(library.id) ? { ...library, syncStatus: 'syncing' as const } : library
    );
  }, [data, isSyncing, variables]);

  const syncLibraries = useCallback((libraryIds?: string[]) => sync({ libraryIds }), [sync]);

  // Creates the library and starts its first sync, which reads its manifest and its rules.
  // Resolves to the new id, or to nothing when it could not be created.
  const createLibrary = useCallback(
    async (input: NewRuleLibraryInput): Promise<string | undefined> => {
      try {
        const { id } = await create(toCreateLibraryRequest(input));
        sync({ libraryIds: [id] });
        return id;
      } catch {
        // The failure is already reported by the mutation.
        return undefined;
      }
    },
    [create, sync]
  );

  // Resolves to whether the library was removed.
  const removeLibrary = useCallback(
    async (libraryId: string, keepRuleVersions: boolean): Promise<boolean> => {
      try {
        await remove({ libraryId, keepRuleVersions });
        return true;
      } catch {
        // The failure is already reported by the mutation.
        return false;
      }
    },
    [remove]
  );

  return {
    libraries,
    isLoading,
    isError,
    isCreating,
    isRemoving,
    syncLibraries,
    createLibrary,
    removeLibrary,
  };
};
