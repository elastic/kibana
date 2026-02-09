/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hook to execute ES|QL queries directly and transform results for the waffle map.
 * This bypasses Lens to give us direct control over the visualization.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { getStartEndParams } from '@kbn/esql-utils';
import { esql, synth, mutate, BasicPrettyPrinter } from '@kbn/esql-language';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type {
  EsqlWaffleNode,
  EsqlWaffleResult,
  GroupedWaffleResult,
  WaffleBounds,
  WaffleGroup,
  ValueFormatConfig,
  ValueFormatter,
} from '../types';
import { parseEsqlQuery } from './use_esql_query_info';

// Re-export for backwards compatibility
export type { ValueFormatter } from '../types';

interface UseEsqlQueryParams {
  /** The ES|QL query to execute */
  query: string;
  /** Time range for named parameters */
  timeRange: { from: string; to: string };
  /** Search service from data plugin */
  search: ISearchStart['search'];
  /** Whether the query should be executed */
  enabled?: boolean;
  /** Optional value formatter function (from fieldFormats service) */
  formatter?: ValueFormatter;
  /** Format config to include in results */
  format?: ValueFormatConfig;
  /** Optional group by fields to group results (supports multiple for nested grouping) */
  groupByFields?: string[];
}

interface UseEsqlQueryResult {
  /** Transformed results for the waffle map (can be flat or grouped) */
  result: EsqlWaffleResult | GroupedWaffleResult | null;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Re-execute the query */
  refetch: () => void;
}

/**
 * Default number formatting when no formatter is provided
 */
const defaultFormatter: ValueFormatter = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  // Basic formatting - just show the number with reasonable precision
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

/**
 * Transform raw ES|QL response into waffle nodes (flat result)
 */
const transformResults = (
  rawResponse: {
    columns?: Array<{ name: string; type: string }>;
    values?: Array<Array<unknown>>;
  },
  metricField: string | undefined,
  dimensions: string[],
  formatter: ValueFormatter = defaultFormatter,
  format?: ValueFormatConfig
): EsqlWaffleResult => {
  const nodes: EsqlWaffleNode[] = [];

  if (!rawResponse?.columns || !rawResponse?.values || rawResponse.values.length === 0) {
    return { nodes, bounds: { min: 0, max: 0 } };
  }

  // Build column index map
  const columnIndexMap = new Map<string, number>();
  rawResponse.columns.forEach((col, idx) => {
    columnIndexMap.set(col.name, idx);
  });

  // Find the metric column - use metricField if provided, otherwise find first numeric column
  let metricColumnIdx = -1;
  if (metricField && columnIndexMap.has(metricField)) {
    metricColumnIdx = columnIndexMap.get(metricField)!;
  } else {
    // Find first column that looks like a metric (not a dimension)
    const dimensionSet = new Set(dimensions);
    for (const [colName, colIdx] of columnIndexMap) {
      if (!dimensionSet.has(colName)) {
        metricColumnIdx = colIdx;
        break;
      }
    }
  }

  // Find the primary dimension column
  let dimensionColumnIdx = -1;
  if (dimensions.length > 0 && columnIndexMap.has(dimensions[0])) {
    dimensionColumnIdx = columnIndexMap.get(dimensions[0])!;
  } else {
    // Find first string column as fallback
    for (const [, colIdx] of columnIndexMap) {
      if (colIdx !== metricColumnIdx) {
        dimensionColumnIdx = colIdx;
        break;
      }
    }
  }

  if (metricColumnIdx === -1) {
    return { nodes, bounds: { min: 0, max: 0 } };
  }

  // Transform rows into nodes
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (const row of rawResponse.values) {
    const metricValue = row[metricColumnIdx];
    const dimensionValue =
      dimensionColumnIdx >= 0 ? row[dimensionColumnIdx] : `Row ${nodes.length + 1}`;

    if (metricValue == null || typeof metricValue !== 'number') {
      continue;
    }

    const numericValue = metricValue as number;
    minValue = Math.min(minValue, numericValue);
    maxValue = Math.max(maxValue, numericValue);

    const label = String(dimensionValue ?? 'Unknown');
    nodes.push({
      id: label,
      label,
      value: numericValue,
      formattedValue: formatter(numericValue),
    });
  }

  // Handle edge cases for bounds
  const bounds: WaffleBounds = {
    min: nodes.length > 0 ? minValue : 0,
    max: nodes.length > 0 ? maxValue : 0,
  };

  // If all values are the same, expand bounds slightly
  if (bounds.min === bounds.max) {
    bounds.min = bounds.min * 0.9;
    bounds.max = bounds.max * 1.1 || 1;
  }

  return { nodes, bounds, format };
};

/**
 * Transform raw ES|QL response into grouped waffle nodes
 * Supports multiple group by fields for nested/hierarchical grouping.
 * Uses user-defined field order for the hierarchy.
 */
const transformGroupedResults = (
  rawResponse: {
    columns?: Array<{ name: string; type: string }>;
    values?: Array<Array<unknown>>;
  },
  metricField: string | undefined,
  dimensions: string[],
  groupByFields: string[],
  formatter: ValueFormatter = defaultFormatter,
  format?: ValueFormatConfig
): GroupedWaffleResult => {
  if (
    !rawResponse?.columns ||
    !rawResponse?.values ||
    rawResponse.values.length === 0 ||
    groupByFields.length === 0
  ) {
    return { groups: [], globalBounds: { min: 0, max: 0 }, groupByFields };
  }

  // Build column index map
  const columnIndexMap = new Map<string, number>();
  rawResponse.columns.forEach((col, idx) => {
    columnIndexMap.set(col.name, idx);
  });

  // Find the metric column
  let metricColumnIdx = -1;
  if (metricField && columnIndexMap.has(metricField)) {
    metricColumnIdx = columnIndexMap.get(metricField)!;
  } else {
    const dimensionSet = new Set([...dimensions, ...groupByFields]);
    for (const [colName, colIdx] of columnIndexMap) {
      if (!dimensionSet.has(colName)) {
        metricColumnIdx = colIdx;
        break;
      }
    }
  }

  // Find the primary dimension column
  let dimensionColumnIdx = -1;
  if (dimensions.length > 0 && columnIndexMap.has(dimensions[0])) {
    dimensionColumnIdx = columnIndexMap.get(dimensions[0])!;
  }

  // Find the group by column indices (preserving user-defined order)
  const groupByColumnIndices: number[] = [];
  for (const field of groupByFields) {
    if (columnIndexMap.has(field)) {
      groupByColumnIndices.push(columnIndexMap.get(field)!);
    }
  }

  if (metricColumnIdx === -1 || groupByColumnIndices.length === 0) {
    return { groups: [], globalBounds: { min: 0, max: 0 }, groupByFields };
  }

  // Build a nested structure: Map<firstGroupValue, Map<secondGroupValue, Map<...>>>
  // Using user-defined field order for the hierarchy
  interface NestedGroupData {
    nodes: EsqlWaffleNode[];
    subgroups: Map<string, NestedGroupData>;
  }

  const rootGroups = new Map<string, NestedGroupData>();

  // Transform rows into nested grouped nodes
  let globalMinValue = Infinity;
  let globalMaxValue = -Infinity;

  for (const row of rawResponse.values) {
    const metricValue = row[metricColumnIdx];
    const dimensionValue =
      dimensionColumnIdx >= 0 ? row[dimensionColumnIdx] : `Row ${rootGroups.size + 1}`;

    if (metricValue == null || typeof metricValue !== 'number') {
      continue;
    }

    const numericValue = metricValue as number;
    globalMinValue = Math.min(globalMinValue, numericValue);
    globalMaxValue = Math.max(globalMaxValue, numericValue);

    // Get group values for each level (using user-defined order)
    const groupValues = groupByColumnIndices.map((idx) => String(row[idx] ?? 'Unknown'));

    const label = String(dimensionValue ?? 'Unknown');
    const node: EsqlWaffleNode = {
      id: `${groupValues.join('-')}-${label}`,
      label,
      value: numericValue,
      formattedValue: formatter(numericValue),
    };

    // Navigate/create the nested structure
    let currentLevel = rootGroups;
    for (let i = 0; i < groupValues.length; i++) {
      const groupValue = groupValues[i];

      if (!currentLevel.has(groupValue)) {
        currentLevel.set(groupValue, { nodes: [], subgroups: new Map() });
      }

      const groupData = currentLevel.get(groupValue)!;

      if (i === groupValues.length - 1) {
        // Last level - add the node here
        groupData.nodes.push(node);
      } else {
        // Navigate deeper
        currentLevel = groupData.subgroups;
      }
    }
  }

  // Convert nested map to WaffleGroup array with proper nesting
  const convertToWaffleGroups = (
    groupMap: Map<string, NestedGroupData>,
    depth: number = 0
  ): WaffleGroup[] => {
    const groups: WaffleGroup[] = [];

    for (const [groupValue, groupData] of groupMap) {
      // Collect all nodes from this group and its subgroups for bounds calculation
      const allNodes: EsqlWaffleNode[] = [];
      const collectNodes = (data: NestedGroupData) => {
        allNodes.push(...data.nodes);
        for (const subData of data.subgroups.values()) {
          collectNodes(subData);
        }
      };
      collectNodes(groupData);

      const groupMinValue = allNodes.length > 0 ? Math.min(...allNodes.map((n) => n.value)) : 0;
      const groupMaxValue = allNodes.length > 0 ? Math.max(...allNodes.map((n) => n.value)) : 0;

      const subgroups =
        groupData.subgroups.size > 0
          ? convertToWaffleGroups(groupData.subgroups, depth + 1)
          : undefined;

      groups.push({
        groupKey: groupValue,
        groupValues: [groupValue],
        nodes: groupData.nodes,
        bounds: {
          min: groupMinValue,
          max: groupMaxValue === groupMinValue ? groupMaxValue * 1.1 || 1 : groupMaxValue,
        },
        subgroups,
      });
    }

    // Sort groups alphabetically
    groups.sort((a, b) => a.groupKey.localeCompare(b.groupKey));

    return groups;
  };

  const groups = convertToWaffleGroups(rootGroups);

  // Handle edge cases for global bounds
  const globalBounds: WaffleBounds = {
    min: groups.length > 0 ? globalMinValue : 0,
    max: groups.length > 0 ? globalMaxValue : 0,
  };

  if (globalBounds.min === globalBounds.max) {
    globalBounds.min = globalBounds.min * 0.9;
    globalBounds.max = globalBounds.max * 1.1 || 1;
  }

  return { groups, globalBounds, format, groupByFields };
};

/**
 * Append time range filter to ES|QL query using the ES|QL AST.
 * Inserts a WHERE clause right after the source command (FROM/TS).
 * Uses named parameters ?_tstart and ?_tend.
 */
const appendTimeRangeFilter = (query: string): string => {
  // Check if the query already has the time range parameters
  if (query.includes('?_tstart') || query.includes('?_tend')) {
    return query;
  }

  try {
    // Parse the query to get the AST
    const composedQuery = esql(query);
    const ast = composedQuery.ast;

    // Create the WHERE command for time range filter
    const whereCommand = synth.cmd`WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;

    // Insert WHERE at index 1 (right after the source command)
    mutate.generic.commands.insert(ast, whereCommand, 1);

    // Print the modified AST back to a query string
    return BasicPrettyPrinter.print(ast);
  } catch {
    // Fallback: append WHERE at the end if AST manipulation fails
    return `${query} | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;
  }
};

/**
 * Hook to execute ES|QL queries and return waffle map data
 */
export const useEsqlQuery = ({
  query,
  timeRange,
  search,
  enabled = true,
  formatter,
  format,
  groupByFields = [],
}: UseEsqlQueryParams): UseEsqlQueryResult => {
  const [result, setResult] = useState<EsqlWaffleResult | GroupedWaffleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Store current values in refs so executeQuery remains stable
  const queryRef = useRef(query);
  const timeRangeRef = useRef(timeRange);
  const enabledRef = useRef(enabled);
  const formatterRef = useRef(formatter);
  const formatRef = useRef(format);
  const groupByFieldsRef = useRef(groupByFields);

  // Keep refs in sync
  queryRef.current = query;
  timeRangeRef.current = timeRange;
  enabledRef.current = enabled;
  formatterRef.current = formatter;
  formatRef.current = format;
  groupByFieldsRef.current = groupByFields;

  // Stable executeQuery that reads from refs
  const executeQuery = useCallback(async () => {
    const currentQuery = queryRef.current;
    const currentTimeRange = timeRangeRef.current;
    const currentEnabled = enabledRef.current;
    const currentFormatter = formatterRef.current;
    const currentFormat = formatRef.current;
    const currentGroupByFields = groupByFieldsRef.current;

    if (!currentEnabled || !currentQuery || currentQuery.length < 10) {
      setResult(null);
      return;
    }

    // Parse query info
    const queryInfo = parseEsqlQuery(currentQuery);

    // Don't execute if query doesn't have a STATS command
    if (!queryInfo.hasStats) {
      setResult(null);
      setError(null);
      return;
    }

    // Build query with time range filter
    const queryWithTimeFilter = appendTimeRangeFilter(currentQuery);

    setIsLoading(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Get named params for time range using the modified query
      const namedParams = getStartEndParams(queryWithTimeFilter, currentTimeRange);

      const response = await search(
        {
          params: {
            query: queryWithTimeFilter,
            ...(namedParams.length > 0 ? { params: namedParams } : {}),
          },
        },
        {
          abortSignal: abortControllerRef.current.signal,
          strategy: 'esql',
        }
      ).toPromise();

      const rawResponse = response?.rawResponse as {
        columns?: Array<{ name: string; type: string }>;
        values?: Array<Array<unknown>>;
      };

      // Transform results into waffle nodes (grouped or flat)
      const waffleResult =
        currentGroupByFields.length > 0
          ? transformGroupedResults(
              rawResponse,
              queryInfo.metricField,
              queryInfo.dimensions,
              currentGroupByFields,
              currentFormatter ?? defaultFormatter,
              currentFormat
            )
          : transformResults(
              rawResponse,
              queryInfo.metricField,
              queryInfo.dimensions,
              currentFormatter ?? defaultFormatter,
              currentFormat
            );

      setResult(waffleResult);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error('Failed to execute query'));
        setResult(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search]); // Only depends on search service which is stable

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    result,
    isLoading,
    error,
    refetch: executeQuery,
  };
};
