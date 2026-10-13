/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableProfilingSchemaSelectorProps } from '@kbn/observability-shared-plugin/public';
import React, { useMemo } from 'react';
import { AsyncStatus } from '../../hooks/use_async';
import { useSelectDefaultSchema } from '../../hooks/use_select_default_schema';
import { getSupportedSchemas } from '../../utils/get_supported_schemas';
import { ProfilingStatusContextProvider } from '../../components/contexts/profiling_status/profiling_status_context';
import { useProfilingStatus } from '../../components/contexts/profiling_status/use_profiling_status';
import { SchemaSelector } from '../../components/schema_selector';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
import { ProfilingEmbeddableProvider } from '../profiling_embeddable_provider';

export type EmbeddableSchemaSelectorProps = EmbeddableProfilingSchemaSelectorProps &
  ProfilingEmbeddablesDependencies;

export type EmbeddableSchemaSelectorSharedComponent =
  React.FC<EmbeddableProfilingSchemaSelectorProps>;

function EmbeddableSchemaSelectorContent({
  schema,
  onSchemaChange,
  schemas,
  isLoadingSchemas,
  schemasError,
}: EmbeddableProfilingSchemaSelectorProps) {
  const profilingStatus = useProfilingStatus();
  const isLoading = isLoadingSchemas || profilingStatus.status !== AsyncStatus.Settled;
  const supportedSchemas = useMemo(
    () => getSupportedSchemas(profilingStatus.data),
    [profilingStatus.data]
  );

  useSelectDefaultSchema({
    schemas,
    supportedSchemas,
    isLoading,
    hasSelectedSchema: schema !== undefined,
    onSelectDefaultSchema: onSchemaChange,
  });

  return (
    <SchemaSelector
      selectedSchema={schema}
      onSchemaChange={onSchemaChange}
      schemas={schemas}
      supportedSchemas={supportedSchemas}
      isLoading={isLoading}
      error={schemasError}
    />
  );
}

export function EmbeddableSchemaSelector({
  schema,
  onSchemaChange,
  schemas,
  isLoadingSchemas,
  schemasError,
  ...deps
}: EmbeddableSchemaSelectorProps) {
  return (
    <ProfilingEmbeddableProvider deps={deps}>
      <ProfilingStatusContextProvider>
        <EmbeddableSchemaSelectorContent
          schema={schema}
          onSchemaChange={onSchemaChange}
          schemas={schemas}
          isLoadingSchemas={isLoadingSchemas}
          schemasError={schemasError}
        />
      </ProfilingStatusContextProvider>
    </ProfilingEmbeddableProvider>
  );
}
