/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useEffect, useMemo } from 'react';
import type { AsyncState } from '../../../hooks/use_async';
import { AsyncStatus } from '../../../hooks/use_async';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { getDefaultSchema } from '../../../utils/get_default_schema';
import { useProfilingDependencies } from '../profiling_dependencies/use_profiling_dependencies';

export interface ProfilingAvailableSchemas {
  /** Schemas with data for the time range and query, undefined while unknown. */
  schemas?: ProfilingSchema[];
  /** Schemas the deployment supports, regardless of their data. */
  supportedSchemas: ProfilingSchema[];
  isLoading: boolean;
  error?: Error;
}

const getSupportedSchemas = (status?: ProfilingSchemasStatus): ProfilingSchema[] => {
  if (!status?.isEnabled) {
    return [];
  }

  return Object.values(ProfilingSchema).filter((schema) =>
    schema === ProfilingSchema.ECS
      ? status.universalProfiling.isAvailable && status.universalProfiling.hasData
      : status.otel.isAvailable && status.otel.hasData
  );
};

type DefaultSchemaSelection =
  | {
      /**
       * When `true`, a default schema will be selected once data settles via `onDefaultSchema`
       */
      shouldSelectDefault: true;
      /**
       * Called with the default schema when `shouldSelectDefault` is `true` and the schemas with data are settled.
       */
      onDefaultSchema: (schema: ProfilingSchema) => void;
    }
  | {
      /**
       * When `false`, no default schema selection will happen. The value of `onDefaultSchema` is ignored.
       */
      shouldSelectDefault: false;
      /**
       * Ignored while `shouldSelectDefault` is `false`.
       */
      onDefaultSchema?: (schema: ProfilingSchema) => void;
    };

type UseProfilingAvailableSchemasParams = {
  /** In milliseconds */
  timeFrom: number;
  /** In milliseconds */
  timeTo: number;
  kuery: string;
  profilingStatus: AsyncState<ProfilingSchemasStatus>;
} & DefaultSchemaSelection;

/** Fetches the schemas with profiling data and selects a default schema if none is selected once the schemas load or encounter an error. */
export const useProfilingAvailableSchemas = ({
  timeFrom,
  timeTo,
  kuery,
  profilingStatus,
  shouldSelectDefault,
  onDefaultSchema,
}: UseProfilingAvailableSchemasParams): ProfilingAvailableSchemas => {
  const {
    services: { fetchAvailableSchemas },
  } = useProfilingDependencies();

  const { data, status, error } = useTimeRangeAsync(
    ({ http }) => fetchAvailableSchemas({ http, timeFrom, timeTo, kuery }),
    [fetchAvailableSchemas, timeFrom, timeTo, kuery]
  );

  const isLoading =
    status !== AsyncStatus.Settled || profilingStatus.status !== AsyncStatus.Settled;
  const schemas = data?.schemas;

  const supportedSchemas = useMemo(
    () => getSupportedSchemas(profilingStatus.data),
    [profilingStatus.data]
  );

  useEffect(() => {
    // Without a selected schema, a default is selected once the schemas with data are known. When they
    // cannot be fetched, the default is still selected so the data can be queried.
    if (shouldSelectDefault && !isLoading) {
      onDefaultSchema(getDefaultSchema(schemas ?? [], supportedSchemas));
    }
  }, [shouldSelectDefault, isLoading, schemas, supportedSchemas, onDefaultSchema]);

  return { schemas, supportedSchemas, isLoading, error };
};
