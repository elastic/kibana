/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hook to fetch available metric and dimension fields for an index pattern.
 * Uses OTel semantic conventions for metric prefix matching when entity is selected.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { getESQLAdHocDataview, getStartEndParams } from '@kbn/esql-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { findEntityByAttribute, type EntityDefinition } from '../types/entity_definitions';

/** Numeric field types that can be used as metrics */
const NUMERIC_TYPES = new Set<string>([
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
  ES_FIELD_TYPES.UNSIGNED_LONG,
  ES_FIELD_TYPES.HISTOGRAM,
]);

/** Field types that can be used as dimensions */
const DIMENSION_TYPES = new Set<string>([
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.UNSIGNED_LONG,
]);

/** Fields to filter out */
const FILTER_OUT_FIELDS = new Set([
  '_id',
  '_index',
  '_source',
  '_size',
  '_doc_count',
  '_field_names',
  '_ignored',
  '_routing',
  '_meta',
  '_tier',
  '_metric_names_hash',
]);

export interface EntityFieldInfo {
  name: string;
  type: string;
  isTimeSeriesDimension?: boolean;
}

export interface MetricFieldInfo {
  name: string;
  type: string;
  instrument?: string;
  unit?: string;
}

export interface UseAvailableMetricsResult {
  allMetricFields: MetricFieldInfo[];
  entityFields: EntityFieldInfo[];
  metricsForSelectedEntity: MetricFieldInfo[];
  fieldsForGroupBy: EntityFieldInfo[];
  setSelectedEntity: (entity: string | null) => void;
  setSelectedMetric: (metric: string | null) => void;
  selectedEntity: string | null;
  selectedMetric: string | null;
  isLoading: boolean;
  isLoadingMetrics: boolean;
  isLoadingGroupByFields: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseAvailableMetricsParams {
  index: string;
  timeRange?: { from: string; to: string };
}

/** Escape field names with dots for ES|QL */
const escapeField = (field: string) => (field.includes('.') ? `\`${field}\`` : field);

/** Build KQL filter for entity's metric prefixes: "system.*: * OR container.*: *" */
const buildMetricPrefixKql = (entity: EntityDefinition): string | null => {
  const prefixes = entity.metricPrefixes ?? [];
  if (prefixes.length === 0) return null;
  return prefixes.map((p) => `${p}*: *`).join(' OR ');
};

/** Parse ES|QL response to find fields with non-null values */
const parseEsqlResponse = (
  rawResponse: { columns?: Array<{ name: string }>; values?: Array<Array<unknown>> },
  targetFieldNames: Set<string>
): { fieldsWithValues: Set<string>; unitsByField: Map<string, string> } => {
  const fieldsWithValues = new Set<string>();
  const unitsByField = new Map<string, string>();

  if (!rawResponse?.columns || !rawResponse?.values?.length) {
    return { fieldsWithValues, unitsByField };
  }

  const colIndex = new Map(rawResponse.columns.map((c, i) => [c.name, i]));
  const unitColIdx = colIndex.get('unit');

  for (const row of rawResponse.values) {
    const rowUnit =
      unitColIdx !== undefined && typeof row[unitColIdx] === 'string'
        ? (row[unitColIdx] as string).trim()
        : undefined;

    for (const [colName, colIdx] of colIndex) {
      if (targetFieldNames.has(colName) && row[colIdx] != null) {
        fieldsWithValues.add(colName);
        if (rowUnit && !unitsByField.has(colName)) {
          unitsByField.set(colName, rowUnit);
        }
      }
    }
  }

  return { fieldsWithValues, unitsByField };
};

export const useAvailableMetrics = ({
  index,
  timeRange,
}: UseAvailableMetricsParams): UseAvailableMetricsResult => {
  const {
    services: { dataViews, http, data },
  } = useKibanaContextForPlugin();

  const [allMetricFields, setAllMetricFields] = useState<MetricFieldInfo[]>([]);
  const [entityFields, setEntityFields] = useState<EntityFieldInfo[]>([]);
  const [metricsForSelectedEntity, setMetricsForSelectedEntity] = useState<MetricFieldInfo[]>([]);
  const [fieldsForGroupBy, setFieldsForGroupBy] = useState<EntityFieldInfo[]>([]);
  const [selectedEntity, setSelectedEntityState] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetricState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingGroupByFields, setIsLoadingGroupByFields] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRefs = useRef({
    fields: null as AbortController | null,
    metrics: null as AbortController | null,
    groupBy: null as AbortController | null,
  });

  // Ref to track latest fetch function to avoid stale closures in useEffect
  const fetchMetricsRef = useRef<((entity: string) => Promise<void>) | null>(null);

  /** Execute ES|QL query */
  const executeQuery = useCallback(
    async (query: string, signal?: AbortSignal) => {
      const namedParams = timeRange ? getStartEndParams(query, timeRange) : [];
      const response = await data.search
        .search(
          { params: { query, ...(namedParams.length > 0 ? { params: namedParams } : {}) } },
          { abortSignal: signal, strategy: 'esql' }
        )
        .toPromise();
      return response?.rawResponse as {
        columns?: Array<{ name: string }>;
        values?: Array<Array<unknown>>;
      };
    },
    [data.search, timeRange]
  );

  /** Build WHERE clause with time range */
  const buildWhereClause = useCallback(
    (filters: string[]) => {
      const allFilters = [...filters];
      if (timeRange) {
        allFilters.push(`@timestamp >= ?_tstart AND @timestamp <= ?_tend`);
      }
      return allFilters.length > 0 ? `| WHERE ${allFilters.join(' AND ')}` : '';
    },
    [timeRange]
  );

  // Fetch field metadata from DataView
  const fetchFields = useCallback(async () => {
    if (!index) {
      setAllMetricFields([]);
      setEntityFields([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    abortRefs.current.fields?.abort();
    abortRefs.current.fields = new AbortController();

    try {
      const dataView: DataView = await getESQLAdHocDataview({
        dataViewsService: dataViews,
        query: `TS ${index}`,
        http,
        options: { allowNoIndex: true, skipFetchFields: false },
      });

      const metrics: MetricFieldInfo[] = [];
      const entities: EntityFieldInfo[] = [];

      dataView.fields.forEach((field: DataViewField) => {
        if (FILTER_OUT_FIELDS.has(field.name) || field.name.startsWith('_')) return;

        const esType = field.esTypes?.[0] || field.type;

        if (field.timeSeriesMetric) {
          metrics.push({
            name: field.name,
            type: esType,
            instrument: field.timeSeriesMetric,
            unit: field.defaultFormatter,
          });
        } else if (field.timeSeriesDimension) {
          entities.push({ name: field.name, type: esType, isTimeSeriesDimension: true });
        } else if (NUMERIC_TYPES.has(esType)) {
          metrics.push({ name: field.name, type: esType, unit: field.defaultFormatter });
        } else if (DIMENSION_TYPES.has(esType)) {
          entities.push({ name: field.name, type: esType });
        }
      });

      setEntityFields(entities.sort((a, b) => a.name.localeCompare(b.name)));
      setAllMetricFields(metrics.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error('Failed to fetch fields'));
        setAllMetricFields([]);
        setEntityFields([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [index, dataViews, http]);

  // Fetch metrics for selected entity with semantic filtering
  const fetchMetricsForEntity = useCallback(
    async (entityField: string) => {
      if (!index || !entityField || allMetricFields.length === 0) {
        setMetricsForSelectedEntity(allMetricFields);
        return;
      }

      setIsLoadingMetrics(true);
      abortRefs.current.metrics?.abort();
      abortRefs.current.metrics = new AbortController();

      try {
        const entity = findEntityByAttribute(entityField);
        const baseFilter = `${escapeField(entityField)} IS NOT NULL`;
        const metricNames = new Set(allMetricFields.map((m) => m.name));

        // Try semantic query first if entity has prefixes
        const kqlFilter = entity ? buildMetricPrefixKql(entity) : null;
        let result: { fieldsWithValues: Set<string>; unitsByField: Map<string, string> } | null =
          null;

        if (kqlFilter) {
          const where = buildWhereClause([baseFilter, `KQL("${kqlFilter}")`]);
          const response = await executeQuery(
            `TS ${index} ${where} | LIMIT 1000`,
            abortRefs.current.metrics.signal
          );
          result = parseEsqlResponse(response, metricNames);
        }

        // Fall back to non-semantic query if no results
        if (!result?.fieldsWithValues.size) {
          const where = buildWhereClause([baseFilter]);
          const response = await executeQuery(
            `TS ${index} ${where} | LIMIT 1000`,
            abortRefs.current.metrics.signal
          );
          result = parseEsqlResponse(response, metricNames);
        }

        if (result.fieldsWithValues.size > 0) {
          setMetricsForSelectedEntity(
            allMetricFields
              .filter((m) => result!.fieldsWithValues.has(m.name))
              .map((m) => ({ ...m, unit: m.unit || result!.unitsByField.get(m.name) }))
          );
        } else {
          setMetricsForSelectedEntity(allMetricFields);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMetricsForSelectedEntity(allMetricFields);
        }
      } finally {
        setIsLoadingMetrics(false);
      }
    },
    [index, allMetricFields, executeQuery, buildWhereClause]
  );

  // Fetch fields for group by
  const fetchFieldsForGroupBy = useCallback(
    async (entityField: string, metric: string) => {
      if (!index || !entityField || !metric || entityFields.length === 0) {
        setFieldsForGroupBy([]);
        return;
      }

      setIsLoadingGroupByFields(true);
      abortRefs.current.groupBy?.abort();
      abortRefs.current.groupBy = new AbortController();

      try {
        const where = buildWhereClause([
          `${escapeField(entityField)} IS NOT NULL`,
          `${escapeField(metric)} IS NOT NULL`,
        ]);
        const response = await executeQuery(
          `TS ${index} ${where} | LIMIT 1000`,
          abortRefs.current.groupBy.signal
        );

        const eligibleFields = new Set(
          entityFields.filter((f) => f.name !== entityField).map((f) => f.name)
        );
        const { fieldsWithValues } = parseEsqlResponse(response, eligibleFields);

        setFieldsForGroupBy(
          entityFields.filter((f) => f.name !== entityField && fieldsWithValues.has(f.name))
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setFieldsForGroupBy([]);
        }
      } finally {
        setIsLoadingGroupByFields(false);
      }
    },
    [index, entityFields, executeQuery, buildWhereClause]
  );

  const setSelectedEntity = useCallback(
    (entity: string | null) => {
      setSelectedEntityState(entity);
      // Metrics fetching is handled by the useEffect that watches selectedEntity
      if (entity && selectedMetric) {
        fetchFieldsForGroupBy(entity, selectedMetric);
      } else if (!entity) {
        setFieldsForGroupBy([]);
      }
    },
    [fetchFieldsForGroupBy, selectedMetric]
  );

  const setSelectedMetric = useCallback(
    (metric: string | null) => {
      setSelectedMetricState(metric);
      if (metric && selectedEntity) {
        fetchFieldsForGroupBy(selectedEntity, metric);
      } else {
        setFieldsForGroupBy([]);
      }
    },
    [fetchFieldsForGroupBy, selectedEntity]
  );

  // Keep ref updated with latest fetch function
  fetchMetricsRef.current = fetchMetricsForEntity;

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // When allMetricFields or selectedEntity changes, fetch metrics
  // Uses ref to avoid re-running when only the function reference changes
  useEffect(() => {
    if (allMetricFields.length > 0 && selectedEntity) {
      fetchMetricsRef.current?.(selectedEntity);
    } else if (!selectedEntity) {
      setMetricsForSelectedEntity(allMetricFields);
    }
  }, [allMetricFields, selectedEntity]);

  useEffect(() => {
    const refs = abortRefs.current;
    return () => {
      refs.fields?.abort();
      refs.metrics?.abort();
      refs.groupBy?.abort();
    };
  }, []);

  return {
    allMetricFields,
    entityFields,
    metricsForSelectedEntity,
    fieldsForGroupBy,
    setSelectedEntity,
    setSelectedMetric,
    selectedEntity,
    selectedMetric,
    isLoading,
    isLoadingMetrics,
    isLoadingGroupByFields,
    error,
    refetch: fetchFields,
  };
};
