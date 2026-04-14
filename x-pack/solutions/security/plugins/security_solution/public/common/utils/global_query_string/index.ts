/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { difference, isEmpty, pickBy } from 'lodash/fp';
import { useDispatch } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import { encode } from '@kbn/rison';
import { cloneDeep } from 'lodash';
import { encodeQueryString, useGetInitialUrlParamValue, useReplaceUrlParams } from './helpers';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { globalUrlParamActions, globalUrlParamSelectors } from '../../store/global_url_param';
import { useRouteSpy } from '../route/use_route_spy';
import { useLinkInfo } from '../../links';

/**
 * Adds urlParamKey and the initial value to redux store.
 *
 * Please call this hook at the highest possible level of the rendering tree.
 * So it is only called when the application starts instead of on every page.
 *
 * @param urlParamKey Must not change.
 * @param onInitialize Called once when initializing. It must not change.
 * @param newUrlParamKey If we want to register the value under a new key.
 */
export const useInitializeUrlParam = <State extends {}>(
  urlParamKey: string,
  /**
   * @param state Decoded URL param value.
   */
  onInitialize: (state: State | null) => void,
  newUrlParamKey?: string
) => {
  const dispatch = useDispatch();

  const getInitialUrlParamValue = useGetInitialUrlParamValue(urlParamKey);

  useEffect(() => {
    const key = newUrlParamKey && newUrlParamKey !== '' ? newUrlParamKey : urlParamKey;
    const value = getInitialUrlParamValue();

    dispatch(
      globalUrlParamActions.registerUrlParam({
        key,
        initialValue: value,
      })
    );

    // execute consumer initialization
    onInitialize(value as State);

    return () => {
      dispatch(globalUrlParamActions.deregisterUrlParam({ key }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- It must run only once when the application is initializing.
  }, []);
};

/**
 * Updates URL parameters in the url.
 *
 * Make sure to call `useInitializeUrlParam` before calling this function.
 */
export const useUpdateUrlParam = <State extends {}>(urlParamKey: string) => {
  const dispatch = useDispatch();

  const updateUrlParam = useCallback(
    (value: State | null) => {
      dispatch(globalUrlParamActions.updateUrlParam({ key: urlParamKey, value }));
    },
    [dispatch, urlParamKey]
  );

  return updateUrlParam;
};

const encodeGlobalUrlParams = (params: Record<string, unknown>) => {
  const encoded: Record<string, string> = {};

  Object.keys(params).forEach((paramName) => {
    const value = params[paramName];

    if (!value || (typeof value === 'object' && isEmpty(value))) {
      return;
    }

    try {
      encoded[paramName] = encode(value);
    } catch {
      // Just ignore parameters which unable to encode
    }
  });

  return encodeQueryString(pickBy((value) => !isEmpty(value), encoded));
};

export const useGlobalQueryString = (overrides?: Record<string, unknown>): string => {
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);
  return useMemo(() => {
    const merged = { ...(globalUrlParam ?? {}) } as Record<string, unknown>;

    Object.keys(overrides ?? {}).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(merged, key)) {
        if (overrides) merged[key] = cloneDeep(overrides[key]);
      }
    });

    return encodeGlobalUrlParams(merged);
  }, [globalUrlParam, overrides]);
};

/**
 * - It hides / shows the global query depending on the page.
 * - It updates the URL when globalUrlParam store updates.
 */
export const useSyncGlobalQueryString = () => {
  const [{ pageName }] = useRouteSpy();
  const globalUrlParam = useShallowEqualSelector(globalUrlParamSelectors.selectGlobalUrlParam);
  const previousGlobalUrlParams = usePrevious(globalUrlParam);
  const replaceUrlParams = useReplaceUrlParams();
  const linkInfo = useLinkInfo(pageName);

  useEffect(() => {
    const { skipUrlState } = linkInfo ?? { skipUrlState: true };
    const paramsToUpdate = { ...globalUrlParam };

    if (skipUrlState) {
      Object.keys(paramsToUpdate).forEach((key) => {
        paramsToUpdate[key] = null;
      });
    }

    // Url params that got deleted from GlobalUrlParams
    const unregisteredKeys = difference(
      Object.keys(previousGlobalUrlParams ?? {}),
      Object.keys(globalUrlParam)
    );

    // Delete unregistered Url params
    unregisteredKeys.forEach((key) => {
      paramsToUpdate[key] = null;
    });

    if (Object.keys(paramsToUpdate).length > 0) {
      replaceUrlParams(paramsToUpdate);
    }
  }, [previousGlobalUrlParams, globalUrlParam, pageName, replaceUrlParams, linkInfo]);
};
