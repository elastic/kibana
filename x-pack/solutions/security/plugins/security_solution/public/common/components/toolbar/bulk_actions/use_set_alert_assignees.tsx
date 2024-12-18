/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback, useEffect, useRef } from 'react';
import type { AlertAssignees } from '../../../../../common/api/detection_engine';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import * as i18n from './translations';
import { setAlertAssignees } from '../../../containers/alert_assignees/api';

export type SetAlertAssigneesFunc = (
  assignees: AlertAssignees,
  ids: string[],
  onSuccess: () => void,
  setTableLoading: (param: boolean) => void
) => Promise<void>;
export type ReturnSetAlertAssignees = SetAlertAssigneesFunc | null;

/**
 * Update alert assignees by query
 *
 * @param assignees to add and/or remove from a batch of alerts
 * @param ids alert ids that will be used to create the update query.
 * @param onSuccess a callback function that will be called on successful api response
 * @param setTableLoading a function that sets the alert table in a loading state for bulk actions

 *
 * @throws An error if response is not OK
 */
export const useSetAlertAssignees = (): ReturnSetAlertAssignees => {
  const { http } = useKibana<CoreStart>().services;
  const { addSuccess, addError } = useAppToasts();
  const setAlertAssigneesRef = useRef<SetAlertAssigneesFunc | null>(null);

  const onUpdateSuccess = useCallback(
    (updated: number = 0) => addSuccess(i18n.UPDATE_ALERT_ASSIGNEES_SUCCESS_TOAST(updated)),
    [addSuccess]
  );

  const onUpdateFailure = useCallback(
    (error: Error) => {
      addError(error.message, { title: i18n.UPDATE_ALERT_ASSIGNEES_FAILURE });
    },
    [addError]
  );

  useEffect(() => {
    let ignore = false;
    const abortCtrl = new AbortController();

    const onSetAlertAssignees: SetAlertAssigneesFunc = async (
      assignees,
      ids,
      onSuccess,
      setTableLoading
    ) => {
      try {
        setTableLoading(true);
        const response = await setAlertAssignees({ assignees, ids, signal: abortCtrl.signal });
        if (!ignore) {
          onSuccess();
          setTableLoading(false);
          onUpdateSuccess(response.updated);
        }
      } catch (error) {
        if (!ignore) {
          setTableLoading(false);
          onUpdateFailure(error);
        }
      }
    };

    setAlertAssigneesRef.current = onSetAlertAssignees;
    return (): void => {
      ignore = true;
      abortCtrl.abort();
    };
  }, [http, onUpdateFailure, onUpdateSuccess]);

  return setAlertAssigneesRef.current;
};
