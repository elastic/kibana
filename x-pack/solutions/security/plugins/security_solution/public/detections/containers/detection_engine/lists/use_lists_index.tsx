/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useReadListIndex, useCreateListIndex } from '@kbn/securitysolution-list-hooks';
import { useHttp, useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useListsPrivileges } from './use_lists_privileges';

export interface UseListsIndexReturn {
  createIndex: () => void;
  indexExists: boolean | null;
  error: unknown;
  loading: boolean;
}

export const useListsIndex = (): UseListsIndexReturn => {
  const { lists } = useKibana().services;
  const http = useHttp();
  const { addError } = useAppToasts();
  const { canReadIndex, canManageIndex, canWriteIndex } = useListsPrivileges();
  const {
    loading: createLoading,
    start: createListIndex,
    error: createListError,
  } = useCreateListIndex({
    http,
    onError: (err) => {
      if (err != null) {
        addError(err, { title: i18n.LISTS_INDEX_CREATE_FAILURE });
      }
    },
  });

  const {
    loading: readLoading,
    result: readResult,
    error: readError,
  } = useReadListIndex({
    http,
    isEnabled: Boolean(lists && canReadIndex && canManageIndex && !createLoading),
    onError: (err) => {
      addError(err, { title: i18n.LISTS_INDEX_FETCH_FAILURE });
    },
  });

  const loading = readLoading || createLoading;

  const createIndex = useCallback(() => {
    if (lists && canManageIndex && canWriteIndex) {
      createListIndex();
    }
  }, [createListIndex, lists, canManageIndex, canWriteIndex]);

  const indexExists = useMemo(() => {
    return readResult != null ? readResult.list_index && readResult.list_item_index : null;
  }, [readResult]);

  return {
    createIndex,
    error: createListError || readError,
    indexExists,
    loading,
  };
};
