/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { updateIndexPattern, type UpdateIndexPatternParams } from '../api';
import * as i18n from './translations';

export interface UseUpdateIndexPatternProps {
  onError?: (error: Error) => void;
  onSuccess?: (data: { updated: number }) => void;
}

export const useUpdateIndexPattern = ({ onError, onSuccess }: UseUpdateIndexPatternProps = {}) => {
  const { addError, addSuccess } = useAppToasts();

  return useMutation<{ updated: number }, Error, UpdateIndexPatternParams>({
    mutationFn: (params: UpdateIndexPatternParams) => updateIndexPattern(params),
    onError: (error: Error) => {
      addError(error, { title: i18n.UPDATE_INDEX_PATTERN_FAILURE });
      onError?.(error);
    },
    onSuccess: (data: { updated: number }) => {
      addSuccess(i18n.UPDATE_INDEX_PATTERN_SUCCESS(data.updated));
      onSuccess?.(data);
    },
  });
};
