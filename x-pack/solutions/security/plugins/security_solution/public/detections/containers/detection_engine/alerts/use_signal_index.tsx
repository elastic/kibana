/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { isSecurityAppError } from '@kbn/securitysolution-t-grid';
import { useSelector } from 'react-redux';

import { useSignalIndexName } from '../../../../data_view_manager/hooks/use_signal_index_name';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getSignalIndex } from './api';
import * as i18n from './translations';
import { useAlertsPrivileges } from './use_alerts_privileges';
import { sourcererSelectors } from '../../../../common/store';
import type { State } from '../../../../common/store';

export interface ReturnSignalIndex {
  loading: boolean;
  signalIndexExists: boolean | null;
  signalIndexName: string | null;
}

/**
 * Hook for managing signal index
 */
export const useSignalIndex = (): ReturnSignalIndex => {
  const [loading, setLoading] = useState(true);
  const [signalIndex, setSignalIndex] = useState<Omit<ReturnSignalIndex, 'loading'>>({
    signalIndexExists: null,
    signalIndexName: null,
  });
  const { addError } = useAppToasts();
  const { hasIndexRead } = useAlertsPrivileges();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const oldSignalIndexName = useSelector((state: State) => {
    return sourcererSelectors.signalIndexName(state);
  });
  const experimentalSignalIndexName = useSignalIndexName();

  const signalIndexName = newDataViewPickerEnabled
    ? experimentalSignalIndexName
    : oldSignalIndexName;

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const signal = await getSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed && signal != null) {
          setSignalIndex({
            signalIndexExists: true,
            signalIndexName: signal.name,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setSignalIndex({
            signalIndexExists: false,
            signalIndexName: null,
          });
          if (isSecurityAppError(error) && error.body.status_code !== 404) {
            addError(error, { title: i18n.SIGNAL_GET_NAME_FAILURE });
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    if (signalIndexName) {
      setSignalIndex({
        signalIndexExists: true,
        signalIndexName,
      });
      setLoading(false);
    } else if (hasIndexRead) {
      fetchData();
    } else {
      // Skip data fetching as the current user doesn't have enough priviliges.
      // Attempt to get the signal index will result in 500 error.
      setLoading(false);
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addError, hasIndexRead, signalIndexName]);

  return { loading, ...signalIndex };
};
