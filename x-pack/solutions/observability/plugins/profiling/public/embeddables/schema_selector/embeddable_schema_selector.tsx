/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableProfilingSchemaSelectorProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { ProfilingStatusContextProvider } from '../../components/contexts/profiling_status/profiling_status_context';
import { useProfilingStatus } from '../../components/contexts/profiling_status/use_profiling_status';
import { useProfilingAvailableSchemas } from '../../components/contexts/profiling_schema/use_profiling_available_schemas';
import { TimeRangeContextProvider } from '../../components/contexts/time_range_context';
import { SchemaSelector } from '../../components/schema_selector';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
import { ProfilingEmbeddableProvider } from '../profiling_embeddable_provider';

export type EmbeddableSchemaSelectorProps = EmbeddableProfilingSchemaSelectorProps &
  ProfilingEmbeddablesDependencies;

export type EmbeddableSchemaSelectorSharedComponent =
  React.FC<EmbeddableProfilingSchemaSelectorProps>;

function EmbeddableSchemaSelectorContent({
  rangeFrom,
  rangeTo,
  kuery,
  schema,
  onSchemaChange,
}: EmbeddableProfilingSchemaSelectorProps) {
  const profilingStatus = useProfilingStatus();
  const availableSchemas = useProfilingAvailableSchemas({
    timeFrom: rangeFrom,
    timeTo: rangeTo,
    kuery,
    profilingStatus,
    shouldSelectDefault: schema === undefined,
    onDefaultSchema: onSchemaChange,
  });

  return (
    <SchemaSelector {...availableSchemas} selectedSchema={schema} onSchemaChange={onSchemaChange} />
  );
}

export function EmbeddableSchemaSelector({
  rangeFrom,
  rangeTo,
  kuery,
  schema,
  onSchemaChange,
  ...deps
}: EmbeddableSchemaSelectorProps) {
  return (
    <ProfilingEmbeddableProvider deps={deps}>
      <ProfilingStatusContextProvider>
        <TimeRangeContextProvider>
          <EmbeddableSchemaSelectorContent
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            kuery={kuery}
            schema={schema}
            onSchemaChange={onSchemaChange}
          />
        </TimeRangeContextProvider>
      </ProfilingStatusContextProvider>
    </ProfilingEmbeddableProvider>
  );
}
