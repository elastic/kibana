/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { NodeViewModel } from '../types';
import {
  getEntityFilterMatchNodeIds,
  hasActiveEntityFilters,
} from '../controls/graph_entity_filters';
import { useGraphSearchContext } from '../controls/graph_search_context';
import {
  GRAPH_ENTITY_FILTER_MATCH_NODE_CLASS,
  GRAPH_SEARCH_ACTIVE_MATCH_NODE_CLASS,
  GRAPH_SEARCH_MATCH_NODE_CLASS,
} from './graph_search_utils';

const SEARCH_RELATED_CLASSES = new Set([
  GRAPH_SEARCH_MATCH_NODE_CLASS,
  GRAPH_SEARCH_ACTIVE_MATCH_NODE_CLASS,
  GRAPH_ENTITY_FILTER_MATCH_NODE_CLASS,
]);

const applySearchClasses = (
  existingClassName: string | undefined,
  nodeId: string,
  matchNodeIds: Set<string>,
  activeMatchNodeId: string | null,
  filterMatchNodeIds: Set<string>,
  hasSearchActive: boolean,
  hasFiltersActive: boolean
): string | undefined => {
  const preserved = (existingClassName ?? '')
    .split(' ')
    .filter((cls) => cls && !SEARCH_RELATED_CLASSES.has(cls));

  if (hasSearchActive && matchNodeIds.has(nodeId)) {
    preserved.push(GRAPH_SEARCH_MATCH_NODE_CLASS);
  }

  if (hasSearchActive && activeMatchNodeId === nodeId) {
    preserved.push(GRAPH_SEARCH_ACTIVE_MATCH_NODE_CLASS);
  }

  if (hasFiltersActive && filterMatchNodeIds.has(nodeId)) {
    preserved.push(GRAPH_ENTITY_FILTER_MATCH_NODE_CLASS);
  }

  return preserved.length > 0 ? preserved.join(' ') : undefined;
};

export interface GraphSearchFlowClasses {
  searchActive: boolean;
  filtersActive: boolean;
}

interface GraphSearchEffectsProps {
  nodes: NodeViewModel[];
  onFlowClassesChange: (classes: GraphSearchFlowClasses) => void;
}

export const GraphSearchEffects = ({ nodes, onFlowClassesChange }: GraphSearchEffectsProps) => {
  const { searchHighlight, entityFilters, searchQuery, setFilterMatchNodeIds } =
    useGraphSearchContext();
  const { setNodes } = useReactFlow();

  const filterMatchNodeIds = useMemo(
    () => getEntityFilterMatchNodeIds(nodes, entityFilters),
    [nodes, entityFilters]
  );

  const hasSearchActive = searchQuery.trim().length > 0 && searchHighlight.matchNodeIds.size > 0;
  const hasFiltersActive = hasActiveEntityFilters(entityFilters);

  useEffect(() => {
    setFilterMatchNodeIds(filterMatchNodeIds);
  }, [filterMatchNodeIds, setFilterMatchNodeIds]);

  useEffect(() => {
    onFlowClassesChange({ searchActive: hasSearchActive, filtersActive: hasFiltersActive });
  }, [hasSearchActive, hasFiltersActive, onFlowClassesChange]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const className = applySearchClasses(
          node.className,
          node.id,
          searchHighlight.matchNodeIds,
          searchHighlight.activeMatchNodeId,
          filterMatchNodeIds,
          hasSearchActive,
          hasFiltersActive
        );

        if (className === node.className) {
          return node;
        }

        return {
          ...node,
          className,
        };
      })
    );
  }, [
    filterMatchNodeIds,
    hasFiltersActive,
    hasSearchActive,
    searchHighlight.activeMatchNodeId,
    searchHighlight.matchNodeIds,
    setNodes,
  ]);

  return null;
};
