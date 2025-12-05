/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export const INSTANCE_SEARCH_PARAM = 'instanceId';
export const REMOTE_NAME_PARAM = 'remoteName';
export const DELETE_SLO = 'delete';
export const RESET_SLO = 'reset';
export const ENABLE_SLO = 'enable';
export const DISABLE_SLO = 'disable';

export function useGetQueryParams() {
  const { search, pathname } = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(search);

  const instanceId = searchParams.get(INSTANCE_SEARCH_PARAM);
  const remoteName = searchParams.get(REMOTE_NAME_PARAM);
  const deleteSlo = searchParams.get(DELETE_SLO);
  const resetSlo = searchParams.get(RESET_SLO);
  const enableSlo = searchParams.get(ENABLE_SLO);
  const disableSlo = searchParams.get(DISABLE_SLO);

  const removeDeleteQueryParam = useCallback(() => {
    const qParams = new URLSearchParams(search);

    // remote delete param from url after initial load
    if (deleteSlo === 'true') {
      qParams.delete(DELETE_SLO);
      history.replace({
        pathname,
        search: qParams.toString(),
      });
    }
  }, [deleteSlo, history, pathname, search]);

  const removeResetQueryParam = useCallback(() => {
    const qParams = new URLSearchParams(search);

    // remote reset param from url after initial load
    if (resetSlo === 'true') {
      qParams.delete(RESET_SLO);
      history.replace({
        pathname,
        search: qParams.toString(),
      });
    }
  }, [resetSlo, history, pathname, search]);

  const removeEnableQueryParam = useCallback(() => {
    const qParams = new URLSearchParams(search);

    // remote enable param from url after initial load
    if (enableSlo === 'true') {
      qParams.delete(ENABLE_SLO);
      history.replace({
        pathname,
        search: qParams.toString(),
      });
    }
  }, [enableSlo, history, pathname, search]);

  const removeDisableQueryParam = useCallback(() => {
    const qParams = new URLSearchParams(search);

    // remote disable param from url after initial load
    if (disableSlo === 'true') {
      qParams.delete(DISABLE_SLO);
      history.replace({
        pathname,
        search: qParams.toString(),
      });
    }
  }, [disableSlo, history, pathname, search]);

  return {
    instanceId: !!instanceId && instanceId !== ALL_VALUE ? instanceId : undefined,
    remoteName: remoteName !== null ? remoteName : undefined,
    isDeletingSlo: deleteSlo === 'true',
    removeDeleteQueryParam,
    isResettingSlo: resetSlo === 'true',
    removeResetQueryParam,
    isEnablingSlo: enableSlo === 'true',
    removeEnableQueryParam,
    isDisablingSlo: disableSlo === 'true',
    removeDisableQueryParam,
  };
}
