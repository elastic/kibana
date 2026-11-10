/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import {
  DETECTION_ENTITIES_QUERY_KEY,
  DETECTION_OVERVIEW_QUERY_KEY,
  DISCOVERY_QUERIES_QUERY_KEY,
} from '../query_keys';
import { useKibana } from '../../hooks/use_kibana';
import { useQueriesApi } from './use_queries_api';

interface UseRulesDemoteParams {
  onSuccess?: () => void;
}

export function useRulesDemote({ onSuccess }: UseRulesDemoteParams) {
  const {
    services: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { demote } = useQueriesApi();

  const mutation = useMutation<void, Error, string[]>({
    mutationFn: async (queryIds) => {
      await demote({ queryIds });
    },
    onSuccess: () => {
      onSuccess?.();

      toasts.addSuccess({
        title: BULK_DELETE_SUCCESS_TOAST_TITLE,
      });
    },
    onError: (error) => {
      toasts.addError(error, {
        title: BULK_DELETE_ERROR_TOAST_TITLE,
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DETECTION_OVERVIEW_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DETECTION_ENTITIES_QUERY_KEY }),
      ]);
    },
  });

  return {
    demoteRules: async (queryIds: string[]) => {
      if (queryIds.length === 0) {
        return;
      }

      await mutation.mutateAsync(queryIds);
    },
    isPending: mutation.isLoading,
  };
}

const BULK_DELETE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.rulesTable.bulkDeleteErrorToastTitle',
  {
    defaultMessage: 'Failed to delete selected rules',
  }
);

const BULK_DELETE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.knowledge.rulesTable.bulkDeleteSuccessToastTitle',
  {
    defaultMessage: 'Rules deleted',
  }
);
