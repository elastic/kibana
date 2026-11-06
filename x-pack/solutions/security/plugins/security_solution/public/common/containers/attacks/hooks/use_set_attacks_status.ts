/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';

import type { SetAttacksStatusRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { setAttacksStatus } from '../api';

import * as i18n from './translations';
import { SET_ATTACKS_STATUS_MUTATION_KEY } from './constants';
import { useInvalidateSearchAttacks } from './use_search_attacks';

/**
 * Hook for setting workflow status on attacks using React Query mutations.
 * Automatically shows success/error toasts and invalidates the search cache on completion.
 *
 * @returns React Query mutation object with mutate function and mutation state
 */
export const useSetAttacksStatus = () => {
  const { addSuccess, addError } = useAppToasts();
  const invalidateSearchAttacks = useInvalidateSearchAttacks();

  return useMutation<{ updated: number }, Error, SetAttacksStatusRequestBody>(
    async (body) => {
      const response = await setAttacksStatus({ body });
      return { updated: response.updated ?? 0 };
    },
    {
      mutationKey: SET_ATTACKS_STATUS_MUTATION_KEY,
      onSuccess: (response) => {
        addSuccess(i18n.SET_ATTACKS_STATUS_SUCCESS_TOAST(response.updated));
      },
      onError: (error) => {
        addError(error, { title: i18n.SET_ATTACKS_STATUS_FAILURE });
      },
      onSettled: () => {
        invalidateSearchAttacks();
      },
    }
  );
};
