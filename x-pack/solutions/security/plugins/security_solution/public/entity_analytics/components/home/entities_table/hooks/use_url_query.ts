/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
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

  // Preserve reference equality for each individual field when its content is
  // unchanged. This prevents cascading re-renders in hooks that depend on specific
  // fields (e.g. `filters`, `query`, `sort`) when only unrelated URL params
  // (like `flyout`) change.
  const previousUrlQueryRef = useRef<T & { flyout: Record<string, unknown> }>();

  const urlQuery = useMemo(() => {
    const decodedParams = decodeMultipleRisonParams<Record<string, unknown>>(
      search,
      URL_PARAM_KEYS
    );

    const queryParams = (decodedParams[QUERY_PARAM_KEY] as Partial<T>) || {};
    const flyoutParams = (decodedParams[FLYOUT_PARAM_KEY] as Record<string, unknown>) || {};

    const next = {
      ...getDefaultQuery(),
      ...queryParams,
      flyout: flyoutParams,
    } as T & { flyout: Record<string, unknown> };

    const prev = previousUrlQueryRef.current;
    if (prev) {
      let allEqual = true;
      (Object.keys(next) as Array<keyof typeof next>).forEach((field) => {
        if (deepEqual(prev[field], next[field])) {
          (next as Record<string, unknown>)[field as string] = prev[field] as unknown;
        } else {
          allEqual = false;
        }
      });
      if (allEqual) {
        return prev;
      }
    }

    previousUrlQueryRef.current = next;
    return next;
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
