/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { DEFAULT_GRAPH_ENTITY_FILTERS, type GraphEntityFiltersState } from './graph_entity_filters';

export interface GraphSearchHighlightState {
  matchNodeIds: Set<string>;
  activeMatchNodeId: string | null;
}

interface GraphSearchContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  entityFilters: GraphEntityFiltersState;
  setEntityFilters: (filters: GraphEntityFiltersState) => void;
  searchHighlight: GraphSearchHighlightState;
  setSearchHighlight: (state: GraphSearchHighlightState) => void;
  filterMatchNodeIds: Set<string>;
  setFilterMatchNodeIds: (nodeIds: Set<string>) => void;
}

const EMPTY_SET = new Set<string>();

const defaultHighlight: GraphSearchHighlightState = {
  matchNodeIds: EMPTY_SET,
  activeMatchNodeId: null,
};

const GraphSearchContext = createContext<GraphSearchContextValue | null>(null);

export const GraphSearchProvider = ({ children }: PropsWithChildren) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilters, setEntityFilters] = useState<GraphEntityFiltersState>(
    DEFAULT_GRAPH_ENTITY_FILTERS
  );
  const [searchHighlight, setSearchHighlightState] =
    useState<GraphSearchHighlightState>(defaultHighlight);
  const [filterMatchNodeIds, setFilterMatchNodeIds] = useState<Set<string>>(EMPTY_SET);

  const setSearchHighlight = useCallback((state: GraphSearchHighlightState) => {
    setSearchHighlightState(state);
  }, []);

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      entityFilters,
      setEntityFilters,
      searchHighlight,
      setSearchHighlight,
      filterMatchNodeIds,
      setFilterMatchNodeIds,
    }),
    [searchQuery, entityFilters, searchHighlight, setSearchHighlight, filterMatchNodeIds]
  );

  return <GraphSearchContext.Provider value={value}>{children}</GraphSearchContext.Provider>;
};

export const useGraphSearchContext = (): GraphSearchContextValue => {
  const context = useContext(GraphSearchContext);

  if (!context) {
    throw new Error('useGraphSearchContext must be used within GraphSearchProvider');
  }

  return context;
};
