/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  EmbeddableProfilingSchemaSelector,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import type { ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import React, { useMemo } from 'react';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

interface Props {
  /** Query of the host's profiling data */
  kuery: string;
}

/** Selects the profiling schema shared through `ProfilingSchemaStateProvider`, offering the schemas with data for the host */
export function ProfilingSchemaSelector({ kuery }: Props) {
  const { schema, setSchema } = useProfilingSchemaState();
  const { isActiveTab } = useTabSwitcherContext();
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const { from, to } = getDateRangeInTimestamp();
  const { request$ } = useRequestObservable<ProfilingSchemasAvailability>();

  const params = useMemo(() => ({ kuery, from, to }), [kuery, from, to]);

  const { data, status, error } = useFetcher(
    async (callApi) => {
      return callApi<ProfilingSchemasAvailability>('/api/infra/profiling/schemas', {
        method: 'GET',
        query: params,
      });
    },
    [params],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('profiling'),
      // The selector tells when the schemas with data cannot be checked
      showToastOnError: false,
    }
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EmbeddableProfilingSchemaSelector
          schema={schema}
          onSchemaChange={setSchema}
          schemas={data?.schemas}
          isLoadingSchemas={isPending(status)}
          schemasError={error}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
