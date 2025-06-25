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
  decodeMultipleRisonParams,
  encodeRisonParam,
} from '@kbn/cloud-security-posture/src/utils/query_utils';

/**
 * @description uses 'rison' to encode/decode a url query
 * @todo replace getDefaultQuery with schema. validate after decoded from URL, use defaultValues
 * @note shallow-merges default, current and next query
 */
export const useUrlQuery = <T extends Record<string, unknown>>(getDefaultQuery: () => T) => {
  const { push, replace } = useHistory();
  const { search, key } = useLocation();

  const urlQuery = useMemo(() => {
    const decodedParams = decodeMultipleRisonParams<Record<string, unknown>>(search, [
      'cspq',
      'flyout',
    ]);

    // Extract cspq parameters (the main query parameters)
    const cspqParams = (decodedParams.cspq as Partial<T>) || {};

    // Extract flyout parameters
    const flyoutParams = (decodedParams.flyout as Record<string, unknown>) || {};

    // Keep parameters separate to avoid conflicts
    return {
      ...getDefaultQuery(),
      ...cspqParams,
      // Keep flyout parameters in a separate namespace
      flyout: flyoutParams,
    };
  }, [getDefaultQuery, search]);

  const setUrlQuery = useCallback(
    (query: Partial<T>) => {
      const mergedQuery = { ...getDefaultQuery(), ...urlQuery, ...query };

      // Separate flyout parameters from the flyout namespace and direct flyout params
      const { flyout, flyoutId, entityId, entityType, entityName, ...cspqParams } = mergedQuery;
      
      // Combine flyout parameters from both sources
      const allFlyoutParams = {
        ...(flyout as Record<string, unknown> || {}),
        ...(flyoutId && { flyoutId }),
        ...(entityId && { entityId }),
        ...(entityType && { entityType }),
        ...(entityName && { entityName }),
      };

      // Encode cspq parameters using the original encodeQuery function
      const cspqSearch = encodeQuery(cspqParams);

      // Build flyout parameters if they exist
      let flyoutSearch = '';
      if (Object.keys(allFlyoutParams).length > 0) {
        flyoutSearch = encodeRisonParam('flyout', allFlyoutParams) || '';
      }

      // Combine search parameters
      const searchParts = [cspqSearch, flyoutSearch].filter(Boolean);
      const finalSearch = searchParts.join('&');

      push({
        search: finalSearch,
      });
    },
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
