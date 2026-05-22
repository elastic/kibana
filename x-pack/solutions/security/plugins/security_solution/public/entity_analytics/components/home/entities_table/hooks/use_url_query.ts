/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
import { parse } from 'query-string';
import { encode } from '@kbn/rison';
import { encodeQuery } from '@kbn/cloud-security-posture';
import {
  QUERY_PARAM_KEY,
  FLYOUT_PARAM_KEY,
  decodeMultipleRisonParams,
} from '@kbn/cloud-security-posture/src/utils/query_utils';
import {
  encodeQueryString,
  getQueryStringFromLocation,
} from '../../../../../common/utils/global_query_string/helpers';

const URL_PARAM_KEYS = [QUERY_PARAM_KEY, FLYOUT_PARAM_KEY];

const safeRisonEncode = (value: unknown): string | undefined => {
  try {
    return encode(value);
  } catch {
    return undefined;
  }
};

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

      // Read the live URL search rather than rebuilding it from scratch so that we
      // preserve every param this hook does not own (e.g. `appQuery`, `filters`,
      // `savedQuery`, `sourcerer`, `timerange`). Wiping them caused a tight
      // feedback loop with `useSyncGlobalQueryString`, which would re-push the
      // dropped params on every URL change.
      const currentSearch = window.location.search;
      const parsed = parse(currentSearch, { sort: false });

      const cspqRison = safeRisonEncode(queryParams);
      if (cspqRison) {
        parsed[QUERY_PARAM_KEY] = cspqRison;
      } else {
        delete parsed[QUERY_PARAM_KEY];
      }

      if (flyout && Object.keys(flyout).length > 0) {
        const flyoutRison = safeRisonEncode(flyout);
        if (flyoutRison) {
          parsed[FLYOUT_PARAM_KEY] = flyoutRison;
        } else {
          delete parsed[FLYOUT_PARAM_KEY];
        }
      } else {
        delete parsed[FLYOUT_PARAM_KEY];
      }

      const nextSearch = encodeQueryString(parsed);

      // String-equality short-circuit. Avoids pushing a duplicate history entry
      // when an effect re-fires (e.g. because `setUrlQuery` got a new identity
      // after an unrelated URL change) but the resulting search would be
      // identical to what is already in the URL.
      if (nextSearch === getQueryStringFromLocation(currentSearch)) {
        return;
      }

      push({
        search: nextSearch,
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
