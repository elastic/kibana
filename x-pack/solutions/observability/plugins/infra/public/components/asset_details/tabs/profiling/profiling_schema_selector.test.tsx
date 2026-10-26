/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import {
  EmbeddableProfilingSchemaSelector,
  ProfilingSchemaStateProvider,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ProfilingSchemaSelector } from './profiling_schema_selector';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  EmbeddableProfilingSchemaSelector: jest.fn(() => null),
}));
jest.mock('../../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));
jest.mock('../../hooks/use_tab_switcher', () => ({
  useTabSwitcherContext: () => ({ isActiveTab: () => true }),
}));
jest.mock('../../hooks/use_date_picker', () => ({
  useDatePickerContext: () => ({
    getDateRangeInTimestamp: () => ({ from: 1000000, to: 1900000 }),
  }),
}));
jest.mock('../../hooks/use_request_observable', () => ({
  useRequestObservable: () => ({ request$: undefined }),
}));

const KUERY = 'host.name : "host-1"';

const getSelectorProps = () => jest.mocked(EmbeddableProfilingSchemaSelector).mock.lastCall![0];

describe('ProfilingSchemaSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetcher).mockReturnValue({
      data: { schemas: [ProfilingSchema.OTEL] },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFetcher>);
  });

  it('offers the schemas with profiling data of the host', async () => {
    const callApi = jest.fn();

    render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelector kuery={KUERY} />
      </ProfilingSchemaStateProvider>
    );
    await jest.mocked(useFetcher).mock.lastCall![0](callApi);

    expect(callApi).toHaveBeenCalledWith('/api/infra/profiling/schemas', {
      method: 'GET',
      query: { kuery: KUERY, from: 1000000, to: 1900000 },
    });
    expect(getSelectorProps()).toEqual(
      expect.objectContaining({
        schema: undefined,
        schemas: [ProfilingSchema.OTEL],
        isLoadingSchemas: false,
      })
    );
  });

  it('shares the selected schema with the other components below the provider', () => {
    function SchemaDisplay() {
      return <span data-test-subj="schema">{useProfilingSchemaState().schema}</span>;
    }
    const { getByTestId } = render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelector kuery={KUERY} />
        <SchemaDisplay />
      </ProfilingSchemaStateProvider>
    );

    act(() => getSelectorProps().onSchemaChange(ProfilingSchema.OTEL));

    expect(getSelectorProps().schema).toBe(ProfilingSchema.OTEL);
    expect(getByTestId('schema')).toHaveTextContent(ProfilingSchema.OTEL);
  });
});
