/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { encodeQuery, decodeQuery } from '@kbn/cloud-security-posture';

/**
 * @description uses 'rison' to encode/decode a url query
 * @todo replace getDefaultQuery with schema. validate after decoded from URL, use defaultValues
 * @note shallow-merges default, current and next query
 */
export const useUrlQuery = <T extends object>(getDefaultQuery: () => T) => {
  const { push, replace } = useHistory();
  const { search, key } = useLocation();

  const urlQuery = useMemo(
    () => ({ ...getDefaultQuery(), ...decodeQuery<T>(search) }),
    [getDefaultQuery, search]
  );

  const setUrlQuery = useCallback(
    (query: Partial<T>) =>
      push({
        search: encodeQuery({ ...getDefaultQuery(), ...urlQuery, ...query }),
      }),
    [getDefaultQuery, urlQuery, push]
  );

  // Set initial query
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
