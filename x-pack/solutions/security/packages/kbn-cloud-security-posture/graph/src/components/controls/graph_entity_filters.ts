/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EdgeViewModel, EntityNodeViewModel, NodeViewModel } from '../types';
import { isEntityNode } from '../utils';

export type GraphAssetCriticalityFilter =
  | 'Extreme impact'
  | 'High impact'
  | 'Medium impact'
  | 'Low impact';

export type GraphNewEntitiesWindow = '7' | '30' | '90' | null;

export interface GraphEntityFiltersState {
  riskScoreMin: number | null;
  assetCriticality: GraphAssetCriticalityFilter[];
  newEntitiesWindow: GraphNewEntitiesWindow;
}

export const DEFAULT_GRAPH_ENTITY_FILTERS: GraphEntityFiltersState = {
  riskScoreMin: null,
  assetCriticality: [],
  newEntitiesWindow: null,
};

export const GRAPH_ASSET_CRITICALITY_OPTIONS: GraphAssetCriticalityFilter[] = [
  'Extreme impact',
  'High impact',
  'Medium impact',
  'Low impact',
];

export const GRAPH_NEW_ENTITIES_WINDOW_OPTIONS: Array<{
  value: GraphNewEntitiesWindow;
  label: string;
}> = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export const hasActiveEntityFilters = (filters: GraphEntityFiltersState): boolean =>
  filters.riskScoreMin !== null ||
  filters.assetCriticality.length > 0 ||
  filters.newEntitiesWindow !== null;

const getEntityRiskScore = (node: EntityNodeViewModel): number | undefined => {
  if (node.riskScore !== undefined) {
    return node.riskScore;
  }

  if (node.riskScoreMax !== undefined) {
    return node.riskScoreMax;
  }

  return node.riskScoreMin;
};

const getEntityFirstSeen = (node: EntityNodeViewModel): string | undefined => {
  if ('firstSeen' in node && typeof node.firstSeen === 'string') {
    return node.firstSeen;
  }

  return undefined;
};

const entityMatchesRiskScoreFilter = (node: EntityNodeViewModel, riskScoreMin: number): boolean => {
  const score = getEntityRiskScore(node);
  return score !== undefined && score >= riskScoreMin;
};

const entityMatchesCriticalityFilter = (
  node: EntityNodeViewModel,
  criticalityFilters: GraphAssetCriticalityFilter[]
): boolean => {
  if (criticalityFilters.length === 0) {
    return true;
  }

  if (node.assetCriticality && criticalityFilters.includes(node.assetCriticality)) {
    return true;
  }

  if (node.assetCriticalityCounts) {
    return criticalityFilters.some((filter) => {
      const level = filter.toLowerCase().replace(/\s+impact$/, '') as
        | 'extreme'
        | 'high'
        | 'medium'
        | 'low';
      return Boolean(node.assetCriticalityCounts?.[level]);
    });
  }

  return false;
};

const entityMatchesNewEntitiesFilter = (
  node: EntityNodeViewModel,
  windowDays: GraphNewEntitiesWindow
): boolean => {
  if (!windowDays) {
    return true;
  }

  const firstSeen = getEntityFirstSeen(node);
  if (!firstSeen) {
    return false;
  }

  const firstSeenMs = Date.parse(firstSeen);
  if (Number.isNaN(firstSeenMs)) {
    return false;
  }

  const windowMs = Number(windowDays) * 24 * 60 * 60 * 1000;
  return Date.now() - firstSeenMs <= windowMs;
};

export const entityMatchesEntityFilters = (
  node: NodeViewModel,
  filters: GraphEntityFiltersState
): boolean => {
  if (!isEntityNode(node)) {
    return true;
  }

  if (filters.riskScoreMin !== null && !entityMatchesRiskScoreFilter(node, filters.riskScoreMin)) {
    return false;
  }

  if (
    filters.assetCriticality.length > 0 &&
    !entityMatchesCriticalityFilter(node, filters.assetCriticality)
  ) {
    return false;
  }

  if (
    filters.newEntitiesWindow !== null &&
    !entityMatchesNewEntitiesFilter(node, filters.newEntitiesWindow)
  ) {
    return false;
  }

  return true;
};

export const getEntityFilterMatchNodeIds = (
  nodes: NodeViewModel[],
  filters: GraphEntityFiltersState
): Set<string> => {
  if (!hasActiveEntityFilters(filters)) {
    return new Set(nodes.map((node) => node.id));
  }

  return new Set(
    nodes.filter((node) => entityMatchesEntityFilters(node, filters)).map((node) => node.id)
  );
};

export const getSearchableEntityNodes = (nodes: NodeViewModel[]): NodeViewModel[] =>
  nodes.filter((node) => isEntityNode(node));

export const getFindInPageMatches = (
  nodes: NodeViewModel[],
  searchQuery: string,
  entityFilters: GraphEntityFiltersState
): NodeViewModel[] => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return [];
  }

  const filterMatchIds = getEntityFilterMatchNodeIds(nodes, entityFilters);

  return getSearchableEntityNodes(nodes).filter((node) => {
    if (!filterMatchIds.has(node.id)) {
      return false;
    }

    const label = node.label ? String(node.label).toLowerCase() : '';
    const tag = 'tag' in node && node.tag ? String(node.tag).toLowerCase() : '';

    return label.includes(query) || tag.includes(query) || node.id.toLowerCase().includes(query);
  });
};

/** Edges connected to at least one visible node stay visible when filtering entities. */
export const getVisibleGraphElements = (
  nodes: NodeViewModel[],
  edges: EdgeViewModel[],
  entityFilters: GraphEntityFiltersState
): { visibleNodeIds: Set<string>; visibleEdgeIds: Set<string> } => {
  if (!hasActiveEntityFilters(entityFilters)) {
    return {
      visibleNodeIds: new Set(nodes.map((node) => node.id)),
      visibleEdgeIds: new Set(edges.map((edge) => edge.id)),
    };
  }

  const matchingEntityIds = getEntityFilterMatchNodeIds(nodes, entityFilters);
  const visibleNodeIds = new Set<string>(matchingEntityIds);

  for (const edge of edges) {
    if (matchingEntityIds.has(edge.source) || matchingEntityIds.has(edge.target)) {
      visibleNodeIds.add(edge.source);
      visibleNodeIds.add(edge.target);
    }
  }

  const visibleEdgeIds = new Set(
    edges
      .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge) => edge.id)
  );

  return { visibleNodeIds, visibleEdgeIds };
};
