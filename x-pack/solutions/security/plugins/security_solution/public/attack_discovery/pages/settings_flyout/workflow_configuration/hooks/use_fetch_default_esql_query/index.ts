/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';

import { useKibana } from '../../../../../../common/lib/kibana';

const ROUTE_PATH = '/internal/attack_discovery/attack_discovery/queries/esql/default';

interface DefaultEsqlQueryResponse {
  query: string;
}

export interface UseFetchDefaultEsqlQueryResult {
  defaultEsqlQuery: string | undefined;
  fetchDefaultEsqlQuery: () => Promise<string | undefined>;
  isError: boolean;
  isLoading: boolean;
  resetCache: () => void;
}

/**
 * Fetches the default ES|QL query from the server on first invocation,
 * then returns the cached result on subsequent calls.
 */
export const useFetchDefaultEsqlQuery = (): UseFetchDefaultEsqlQueryResult => {
  const { http } = useKibana().services;
  const [defaultEsqlQuery, setDefaultEsqlQuery] = useState<string | undefined>(undefined);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchDefaultEsqlQuery = useCallback(async (): Promise<string | undefined> => {
    if (hasFetchedRef.current) {
      return defaultEsqlQuery;
    }

    if (!http) {
      return undefined;
    }

    hasFetchedRef.current = true;
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await http.get<DefaultEsqlQueryResponse>(ROUTE_PATH, {
        version: '1',
      });

      setDefaultEsqlQuery(response.query);
      setIsLoading(false);

      return response.query;
    } catch (error) {
      hasFetchedRef.current = false;
      setIsError(true);
      setIsLoading(false);

      return undefined;
    }
  }, [defaultEsqlQuery, http]);

  const resetCache = useCallback(() => {
    hasFetchedRef.current = false;
    setDefaultEsqlQuery(undefined);
  }, []);

  return {
    defaultEsqlQuery,
    fetchDefaultEsqlQuery,
    isError,
    isLoading,
    resetCache,
  };
};
