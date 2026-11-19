/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { ProfilingSearchBar } from '../../components/profiling_app_page_template/profiling_search_bar';
import type { ProfilingEmbeddablesDependencies } from '../profiling_embeddable_provider';
import { EmbeddableSearchBar } from './embeddable_search_bar';

jest.mock('../../components/profiling_app_page_template/profiling_search_bar', () => ({
  ProfilingSearchBar: jest.fn(() => null),
}));
jest.mock('../profiling_embeddable_provider', () => ({
  ProfilingEmbeddableProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('EmbeddableSearchBar', () => {
  it('suggests the fields of the given schema', () => {
    render(
      <EmbeddableSearchBar
        {...({} as ProfilingEmbeddablesDependencies)}
        kuery=""
        rangeFrom="now-15m"
        rangeTo="now"
        onQuerySubmit={jest.fn()}
        onRefresh={jest.fn()}
        schema={ProfilingSchema.OTEL}
      />
    );

    expect(ProfilingSearchBar).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });
});
