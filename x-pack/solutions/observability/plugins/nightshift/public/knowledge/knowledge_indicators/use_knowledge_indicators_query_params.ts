/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export interface KnowledgeIndicatorsQuery {
  search?: string;
  status?: string;
  type?: string[];
  subtype?: string[];
  source?: string[];
  stream?: string[];
  showComputed?: string;
  selectedItem?: string;
}

const scalarKeys = ['search', 'status', 'showComputed', 'selectedItem'] as const;
const arrayKeys = ['type', 'subtype', 'source', 'stream'] as const;

const getLocation = (query: KnowledgeIndicatorsQuery) => {
  const params = new URLSearchParams();
  for (const key of scalarKeys) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  for (const key of arrayKeys) {
    for (const value of query[key] ?? []) {
      if (value) params.append(key, value);
    }
  }
  return { pathname: '/knowledge/knowledge_indicators', search: params.toString() };
};

export const useKnowledgeIndicatorsQueryParams = (): {
  query: KnowledgeIndicatorsQuery;
  push: (next: KnowledgeIndicatorsQuery) => void;
  replace: (next: KnowledgeIndicatorsQuery) => void;
} => {
  const history = useHistory();
  const { search } = useLocation();
  const query = useMemo(() => {
    const params = new URLSearchParams(search);
    const result: KnowledgeIndicatorsQuery = {};
    for (const key of scalarKeys) result[key] = params.get(key) ?? undefined;
    for (const key of arrayKeys) result[key] = params.has(key) ? params.getAll(key) : undefined;
    return result;
  }, [search]);
  const push = useCallback(
    (next: KnowledgeIndicatorsQuery) => history.push(getLocation(next)),
    [history]
  );
  const replace = useCallback(
    (next: KnowledgeIndicatorsQuery) => history.replace(getLocation(next)),
    [history]
  );
  return { query, push, replace };
};
