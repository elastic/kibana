/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingSearchBar } from './profiling_search_bar';

jest.mock('@kbn/unified-search-plugin/public', () => ({ SearchBar: jest.fn(() => null) }));
jest.mock('../contexts/profiling_dependencies/use_profiling_dependencies');

const mockedSearchBar = jest.mocked(SearchBar);

describe('ProfilingSearchBar', () => {
  const create = jest.fn();

  // Each schema gets a data view titled after its events index.
  const createDataView = (title: string) => ({ title } as DataView);

  const renderSearchBar = (schema?: ProfilingSchema) => {
    const props = { kuery: '', onQuerySubmit: jest.fn(), onRefreshClick: jest.fn() };
    const { rerender } = render(<ProfilingSearchBar {...props} schema={schema} />);

    return {
      changeSchema: (nextSchema: ProfilingSchema) =>
        rerender(<ProfilingSearchBar {...props} schema={nextSchema} />),
    };
  };

  const getIndexPatterns = () => mockedSearchBar.mock.lastCall?.[0].indexPatterns;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useProfilingDependencies).mockReturnValue({
      start: { dataViews: { create } },
    } as unknown as ReturnType<typeof useProfilingDependencies>);
    create.mockImplementation(async ({ title }: { title: string }) => createDataView(title));
  });

  it('suggests fields from the Universal Profiling events by default', async () => {
    renderSearchBar();

    await waitFor(() =>
      expect(getIndexPatterns()).toEqual([
        createDataView(PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.ECS]),
      ])
    );
  });

  it.each(Object.values(ProfilingSchema))(
    'reuses the %s data view by requesting it with a stable id',
    async (schema) => {
      renderSearchBar(schema);

      await waitFor(() => expect(getIndexPatterns()).toHaveLength(1));
      expect(create).toHaveBeenCalledWith({
        id: PROFILING_EVENTS_INDEX_BY_SCHEMA[schema],
        title: PROFILING_EVENTS_INDEX_BY_SCHEMA[schema],
      });
    }
  );

  it.each(Object.values(ProfilingSchema))('suggests fields from the %s events', async (schema) => {
    renderSearchBar(schema);

    await waitFor(() =>
      expect(getIndexPatterns()).toEqual([createDataView(PROFILING_EVENTS_INDEX_BY_SCHEMA[schema])])
    );
  });

  it('suggests fields from the events of a newly selected schema', async () => {
    const { changeSchema } = renderSearchBar(ProfilingSchema.ECS);
    await waitFor(() => expect(getIndexPatterns()).toHaveLength(1));

    changeSchema(ProfilingSchema.OTEL);

    await waitFor(() =>
      expect(getIndexPatterns()).toEqual([
        createDataView(PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.OTEL]),
      ])
    );
  });

  it('ignores the data view of a previous schema that is created last', async () => {
    const resolvers: Array<() => void> = [];
    create.mockImplementation(
      ({ title }: { title: string }) =>
        new Promise((resolve) => resolvers.push(() => resolve(createDataView(title))))
    );

    const { changeSchema } = renderSearchBar(ProfilingSchema.ECS);
    changeSchema(ProfilingSchema.OTEL);

    const [resolveEcsDataView, resolveOtelDataView] = resolvers;
    await act(async () => resolveOtelDataView());
    await act(async () => resolveEcsDataView());

    expect(getIndexPatterns()).toEqual([
      createDataView(PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.OTEL]),
    ]);
  });
});
