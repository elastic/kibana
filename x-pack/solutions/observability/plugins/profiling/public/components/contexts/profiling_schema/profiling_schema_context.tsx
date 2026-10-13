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
import { useSchemaQueryParam } from '../../../hooks/use_schema_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useProfilingStatus } from '../profiling_status/use_profiling_status';
import type { ProfilingAvailableSchemas } from './use_profiling_available_schemas';
import { useProfilingAvailableSchemas } from './use_profiling_available_schemas';

export interface ProfilingSchemaContextValue extends ProfilingAvailableSchemas {
  /** Schema selected in the URL, undefined until a default is selected. */
  selectedSchema?: ProfilingSchema;
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
  const history = useHistory();
  const schema = useSchemaQueryParam();
  // Although the status is always settled and enabled here,
  // the raw status is used anyway because `useProfilingAvailableSchemas` takes the async status
  const profilingStatus = useProfilingStatus();
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

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
  const onDefaultSchema = useCallback(
    (nextSchema: ProfilingSchema) => setSchemaInUrl(nextSchema, { replace: true }),
    [setSchemaInUrl]
  );

  const { schemas, supportedSchemas, isLoading, error } = useProfilingAvailableSchemas({
    timeFrom: new Date(timeRange.start).getTime(),
    timeTo: new Date(timeRange.end).getTime(),
    kuery,
    profilingStatus,
    shouldSelectDefault: schema === undefined,
    onDefaultSchema,
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
