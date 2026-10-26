/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  EmbeddableProfilingSearchBar,
  ProfilingEmptyState,
} from '@kbn/observability-shared-plugin/public';
import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { DescriptionCallout } from './description_callout';
import { Flamegraph } from './flamegraph';
import { ProfilingSchemaSelector } from './profiling_schema_selector';
import { Profiling } from './profiling';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  EmbeddableProfilingSearchBar: jest.fn(() => null),
  ProfilingEmptyState: jest.fn(() => null),
  useProfilingSchemaState: () => ({ schema: 'otel', setSchema: jest.fn() }),
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
    dateRange: { from: 'now-15m', to: 'now' },
    setDateRange: jest.fn(),
  }),
}));
jest.mock('../../hooks/use_profiling_kuery', () => ({
  useProfilingKuery: () => ({ fullKuery: '', customKuery: '', setCustomKuery: jest.fn() }),
}));
jest.mock('../../hooks/use_request_observable', () => ({
  useRequestObservable: () => ({ request$: undefined }),
}));
jest.mock('./description_callout', () => ({ DescriptionCallout: jest.fn(() => null) }));
jest.mock('./flamegraph', () => ({ Flamegraph: jest.fn(() => null) }));
jest.mock('./profiling_schema_selector', () => ({ ProfilingSchemaSelector: jest.fn(() => null) }));
jest.mock('./functions', () => ({ Functions: () => null }));
jest.mock('./threads', () => ({ Threads: () => null }));

const createStatus = ({
  hasOtelData,
  hasUniversalProfilingData,
  hasUniversalProfilingSetup,
}: {
  hasOtelData: boolean;
  hasUniversalProfilingData: boolean;
  hasUniversalProfilingSetup: boolean;
}): ProfilingSchemasStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: hasOtelData },
  universalProfiling: {
    isAvailable: true,
    hasSetup: hasUniversalProfilingSetup,
    hasData: hasUniversalProfilingData,
    hasLegacyData: false,
  },
});

const mockStatus = (data: ProfilingSchemasStatus) =>
  jest.mocked(useFetcher).mockReturnValue({
    data,
    status: FETCH_STATUS.SUCCESS,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useFetcher>);

describe('Profiling tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'only OpenTelemetry profiling data',
      createStatus({
        hasOtelData: true,
        hasUniversalProfilingData: false,
        hasUniversalProfilingSetup: false,
      }),
    ],
    [
      'Universal Profiling data that is set up',
      createStatus({
        hasOtelData: false,
        hasUniversalProfilingData: true,
        hasUniversalProfilingSetup: true,
      }),
    ],
  ])('shows the profiling data when there is %s', (_description, status) => {
    mockStatus(status);

    render(<Profiling />);

    expect(DescriptionCallout).toHaveBeenCalled();
    expect(ProfilingEmptyState).not.toHaveBeenCalled();
  });

  it.each([
    [
      'no profiling data',
      createStatus({
        hasOtelData: false,
        hasUniversalProfilingData: false,
        hasUniversalProfilingSetup: true,
      }),
    ],
    [
      'only Universal Profiling data that is not set up',
      createStatus({
        hasOtelData: false,
        hasUniversalProfilingData: true,
        hasUniversalProfilingSetup: false,
      }),
    ],
    ['profiling disabled in Elasticsearch', { isEnabled: false } as const],
  ])('prompts to set up profiling when there is %s', (_description, status) => {
    mockStatus(status);

    render(<Profiling />);

    expect(ProfilingEmptyState).toHaveBeenCalled();
    expect(DescriptionCallout).not.toHaveBeenCalled();
  });

  it('selects the schema of the host profiling data and shows the data of the selected schema', () => {
    mockStatus(
      createStatus({
        hasOtelData: true,
        hasUniversalProfilingData: false,
        hasUniversalProfilingSetup: false,
      })
    );

    render(<Profiling />);

    expect(ProfilingSchemaSelector).toHaveBeenCalledWith({ kuery: '' }, expect.anything());
    expect(Flamegraph).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
    expect(EmbeddableProfilingSearchBar).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });
});
