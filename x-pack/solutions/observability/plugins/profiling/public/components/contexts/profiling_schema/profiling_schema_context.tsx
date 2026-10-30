/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import qs from 'query-string';
import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { AsyncStatus } from '../../../hooks/use_async';
import { useSchemaQueryParam } from '../../../hooks/use_schema_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';
import { useEnabledProfilingStatus } from '../profiling_status/use_enabled_profiling_status';
import { useSelectDefaultSchema } from '../../../hooks/use_select_default_schema';
import { getSupportedSchemas } from '../../../utils/get_supported_schemas';

/** The schema selected in the URL and the schemas the selector offers */
export interface ProfilingSchemaContextValue {
  /** Undefined until a default is selected */
  selectedSchema?: ProfilingSchema;
  onSchemaChange: (schema: ProfilingSchema) => void;
  /** Schemas with data, undefined while unknown */
  schemas?: ProfilingSchema[];
  /** Schemas the deployment supports, regardless of their data */
  supportedSchemas: ProfilingSchema[];
  /** Whether the schemas with data or the supported schemas are loading */
  isLoading: boolean;
  /** Set when the schemas with data cannot be fetched */
  error?: Error;
}

export const ProfilingSchemaContext = React.createContext<ProfilingSchemaContextValue | undefined>(
  undefined
);

export function ProfilingSchemaContextProvider({
  rangeFrom,
  rangeTo,
  kuery,
  children,
}: {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  children: React.ReactNode;
}) {
  const {
    services: { fetchAvailableSchemas },
  } = useProfilingDependencies();
  const history = useHistory();
  const schema = useSchemaQueryParam();
  const { data: profilingStatus } = useEnabledProfilingStatus();
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const schemasWithData = useTimeRangeAsync(
    ({ http }) =>
      fetchAvailableSchemas({
        http,
        timeFrom: new Date(timeRange.start).getTime(),
        timeTo: new Date(timeRange.end).getTime(),
        kuery,
      }),
    [fetchAvailableSchemas, timeRange.start, timeRange.end, kuery]
  );

  const setSchemaInUrl = useCallback(
    (nextSchema: ProfilingSchema, { replace }: { replace?: boolean }) => {
      const { location } = history;
      const nextLocation = {
        ...location,
        search: qs.stringify({ ...qs.parse(location.search), schema: nextSchema }),
      };

      if (replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history]
  );

  // The default schema replaces the URL without a schema instead of adding a history entry
  const onSelectDefaultSchema = useCallback(
    (nextSchema: ProfilingSchema) => setSchemaInUrl(nextSchema, { replace: true }),
    [setSchemaInUrl]
  );

  const schemas = schemasWithData.data?.schemas;
  const { error } = schemasWithData;
  const isLoading = schemasWithData.status !== AsyncStatus.Settled;
  const supportedSchemas = useMemo(() => getSupportedSchemas(profilingStatus), [profilingStatus]);

  useSelectDefaultSchema({
    schemas,
    supportedSchemas,
    isLoading,
    hasSelectedSchema: schema !== undefined,
    onSelectDefaultSchema,
  });

  const onSchemaChange = useCallback(
    (nextSchema: ProfilingSchema) => setSchemaInUrl(nextSchema, { replace: false }),
    [setSchemaInUrl]
  );

  const value = useMemo(
    () => ({
      selectedSchema: schema,
      schemas,
      supportedSchemas,
      isLoading,
      error,
      onSchemaChange,
    }),
    [schema, schemas, supportedSchemas, isLoading, error, onSchemaChange]
  );

  return (
    <ProfilingSchemaContext.Provider value={value}>{children}</ProfilingSchemaContext.Provider>
  );
}
