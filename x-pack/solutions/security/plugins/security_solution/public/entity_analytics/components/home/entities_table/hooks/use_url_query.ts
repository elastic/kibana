/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { encodeQuery } from '@kbn/cloud-security-posture';
import {
  QUERY_PARAM_KEY,
  FLYOUT_PARAM_KEY,
  decodeMultipleRisonParams,
  encodeRisonParam,
} from '@kbn/cloud-security-posture/src/utils/query_utils';

const URL_PARAM_KEYS = [QUERY_PARAM_KEY, FLYOUT_PARAM_KEY];

export const useUrlQuery = <T extends Record<string, unknown>>(getDefaultQuery: () => T) => {
  const { push, replace } = useHistory();
  const { search, key } = useLocation();

  const urlQuery = useMemo(() => {
    const decodedParams = decodeMultipleRisonParams<Record<string, unknown>>(
      search,
      URL_PARAM_KEYS
    );

    const queryParams = (decodedParams[QUERY_PARAM_KEY] as Partial<T>) || {};
    const flyoutParams = (decodedParams[FLYOUT_PARAM_KEY] as Record<string, unknown>) || {};

    return {
      ...getDefaultQuery(),
      ...queryParams,
      flyout: flyoutParams,
    };
  }, [getDefaultQuery, search]);

  const setUrlQuery = useCallback(
    (query: Partial<T>) => {
      const mergedQuery = { ...getDefaultQuery(), ...urlQuery, ...query };

      const { flyout, ...queryParams } = mergedQuery;

      const queryParamsSearch = encodeQuery(queryParams);
      const flyoutSearch = buildFlyoutSearchString(flyout);

      const finalSearch = combineSearchParts([queryParamsSearch, flyoutSearch]);

      push({
        search: finalSearch,
      });
    },
    [getDefaultQuery, urlQuery, push]
  );

  useEffect(() => {
    if (search) return;

    replace({ search: encodeQuery(getDefaultQuery()) });
  }, [getDefaultQuery, search, replace]);

  return {
    key,
    urlQuery,
    setUrlQuery,
  };
};

function buildFlyoutSearchString(flyoutParams: Record<string, unknown>): string {
  if (Object.keys(flyoutParams).length === 0) {
    return '';
  }

  return encodeRisonParam(FLYOUT_PARAM_KEY, flyoutParams) || '';
}

function combineSearchParts(searchParts: Array<string | undefined>): string {
  return searchParts.filter(Boolean).join('&');
}
