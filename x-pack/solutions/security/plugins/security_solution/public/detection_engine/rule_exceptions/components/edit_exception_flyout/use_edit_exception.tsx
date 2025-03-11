/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useCreateOrUpdateException } from '../../logic/use_create_update_exception';

export interface EditExceptionItemHookProps {
  itemsToUpdate: ExceptionListItemSchema[];
}

export type EditExceptionItemHookFuncProps = (arg: EditExceptionItemHookProps) => Promise<void>;

export type ReturnUseEditExceptionItems = [boolean, EditExceptionItemHookFuncProps | null];

/**
 * Hook for editing exception items from flyout
 *
 */
export const useEditExceptionItems = (): ReturnUseEditExceptionItems => {
  const { addSuccess, addError, addWarning } = useAppToasts();
  const [isAddingExceptions, updateExceptions] = useCreateOrUpdateException();

  const [isLoading, setIsLoading] = useState(false);
  const updateExceptionsRef = useRef<EditExceptionItemHookFuncProps | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const updateExceptionItem = async ({ itemsToUpdate }: EditExceptionItemHookProps) => {
      if (updateExceptions == null) return;

      try {
        setIsLoading(true);

        await updateExceptions(itemsToUpdate);

        addSuccess({
          title: i18n.EDIT_RULE_EXCEPTION_SUCCESS_TITLE,
          text: i18n.EDIT_RULE_EXCEPTION_SUCCESS_TEXT(
            itemsToUpdate.map(({ name }) => name).join(', '),
            itemsToUpdate.length
          ),
        });

        if (isSubscribed) {
          setIsLoading(false);
        }
      } catch (e) {
        if (isSubscribed) {
          setIsLoading(false);
          addError(e, { title: i18n.EDIT_RULE_EXCEPTION_ERROR_TITLE });
          throw new Error(e);
        }
      }
    };

    updateExceptionsRef.current = updateExceptionItem;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addSuccess, addError, addWarning, updateExceptions]);

  return [isLoading || isAddingExceptions, updateExceptionsRef.current];
};
