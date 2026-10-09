/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import qs from 'query-string';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { AsyncStatus } from '../../../hooks/use_async';
import { useSchemaQueryParam } from '../../../hooks/use_schema_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { getDefaultSchema } from '../../../utils/get_default_schema';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';
import { useEnabledProfilingStatus } from '../profiling_status/use_enabled_profiling_status';

export interface ProfilingSchemaContextValue {
  /** Schema selected in the URL, undefined until a default is selected. */
  selectedSchema?: ProfilingSchema;
  /** Schemas with data for the time range and query, undefined while unknown. */
  schemas?: ProfilingSchema[];
  /** Schemas the deployment supports, regardless of their data. */
  supportedSchemas: ProfilingSchema[];
  isLoading: boolean;
  /** Set when the schemas with data cannot be fetched. */
  error?: Error;
  onSchemaChange: (schema: ProfilingSchema) => void;
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

  const { data, status, error } = useTimeRangeAsync(
    ({ http }) =>
      fetchAvailableSchemas({
        http,
        timeFrom: new Date(timeRange.start).getTime(),
        timeTo: new Date(timeRange.end).getTime(),
        kuery,
      }),
    [fetchAvailableSchemas, timeRange.start, timeRange.end, kuery]
  );

  const isLoading = status !== AsyncStatus.Settled;
  const schemas = data?.schemas;

  const supportedSchemas = useMemo(
    () =>
      Object.values(ProfilingSchema).filter((supportedSchema) =>
        supportedSchema === ProfilingSchema.ECS
          ? profilingStatus.universalProfiling.isAvailable &&
            profilingStatus.universalProfiling.hasData
          : profilingStatus.otel.isAvailable && profilingStatus.otel.hasData
      ),
    [profilingStatus]
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

  useEffect(() => {
    // A URL without schema gets a default once the schemas with data are known. When they cannot
    // be fetched, the default is still selected so the page can query data.
    if (!schema && !isLoading) {
      setSchemaInUrl(getDefaultSchema(schemas ?? [], supportedSchemas), { replace: true });
    }
  }, [schema, isLoading, schemas, supportedSchemas, setSchemaInUrl]);

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
