/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EmbeddableStackTraces } from '@kbn/observability-shared-plugin/public';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { Flamegraph } from './flamegraph';
import { Functions } from './functions';
import { ProfilingLinks } from './profiling_links';
import { Threads } from './threads';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  EmbeddableFlamegraph: () => null,
  EmbeddableFunctions: () => null,
  EmbeddableStackTraces: jest.fn(() => null),
}));
jest.mock('../../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      observabilityShared: {
        locators: {
          profiling: { flamegraphLocator: {}, topNFunctionsLocator: {}, stacktracesLocator: {} },
        },
      },
    },
  }),
}));
jest.mock('../../hooks/use_asset_details_render_props', () => ({
  useAssetDetailsRenderPropsContext: () => ({
    entity: { name: 'host-1' },
    renderMode: { mode: 'flyout' },
  }),
}));
jest.mock('../../hooks/use_tab_switcher', () => ({
  useTabSwitcherContext: () => ({ isActiveTab: () => true }),
}));
jest.mock('../../hooks/use_date_picker', () => ({
  useDatePickerContext: () => ({
    dateRange: { from: 'now-15m', to: 'now' },
    getDateRangeInTimestamp: () => ({ from: 1000000, to: 1900000 }),
    setDateRange: jest.fn(),
  }),
}));
jest.mock('../../hooks/use_request_observable', () => ({
  useRequestObservable: () => ({ request$: undefined }),
}));
jest.mock('./profiling_links', () => ({ ProfilingLinks: jest.fn(() => null) }));

const KUERY = 'host.name : "host-1"';

// Runs the request the view passes to `useFetcher`
const requestData = async () => {
  const callApi = jest.fn();
  await jest.mocked(useFetcher).mock.lastCall![0](callApi);
  return callApi;
};

const expectLinksWithSchema = () =>
  expect(ProfilingLinks).toHaveBeenCalledWith(
    expect.objectContaining({ schema: ProfilingSchema.OTEL }),
    expect.anything()
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useFetcher).mockReturnValue({
    status: FETCH_STATUS.NOT_INITIATED,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useFetcher>);
});

describe.each([
  ['Flamegraph', Flamegraph, '/api/infra/profiling/flamegraph', {}],
  ['Functions', Functions, '/api/infra/profiling/functions', { startIndex: 0, endIndex: 10 }],
])('%s', (_name, View, path, extraQuery) => {
  it('waits for a schema before requesting the profiling data', async () => {
    render(<View kuery={KUERY} />);

    expect(await requestData()).not.toHaveBeenCalled();
  });

  it('requests the profiling data of the selected schema', async () => {
    render(<View kuery={KUERY} schema={ProfilingSchema.OTEL} />);

    expect(await requestData()).toHaveBeenCalledWith(path, {
      method: 'GET',
      query: {
        kuery: KUERY,
        from: 1000000,
        to: 1900000,
        ...extraQuery,
        schema: ProfilingSchema.OTEL,
      },
    });
  });

  it('links to the Profiling app with the selected schema', () => {
    render(<View kuery={KUERY} schema={ProfilingSchema.OTEL} />);

    expectLinksWithSchema();
  });
});

describe('Threads', () => {
  it('waits for a schema before showing the stacktraces', () => {
    render(<Threads kuery={KUERY} />);

    expect(EmbeddableStackTraces).not.toHaveBeenCalled();
  });

  it('shows the stacktraces of the selected schema', () => {
    render(<Threads kuery={KUERY} schema={ProfilingSchema.OTEL} />);

    expect(EmbeddableStackTraces).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: KUERY, schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
    expectLinksWithSchema();
  });
});
