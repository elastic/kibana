/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FrameType, ProfilingSchema } from '@kbn/profiling-utils';

let mockSchema: ProfilingSchema | undefined;

jest.mock('../contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    start: {
      core: {
        docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co/', DOC_LINK_VERSION: 'current' },
      },
    },
  }),
}));
jest.mock('../../hooks/use_profiling_router', () => ({
  useProfilingRouter: () => ({
    link: (path: string, { query }: { query: Record<string, string> }) => {
      const search = new URLSearchParams(query).toString();
      return search ? `${path}?${search}` : path;
    },
  }),
}));
jest.mock('../../hooks/use_schema_query_param', () => ({
  useSchemaQueryParam: () => mockSchema,
}));

import { MissingSymbolsCallout } from './missing_symbols_callout';

describe('MissingSymbolsCallout', () => {
  const getUploadSymbolsHref = () => {
    render(
      <I18nProvider>
        <MissingSymbolsCallout frameType={FrameType.Native} />
      </I18nProvider>
    );

    return screen
      .getByTestId('profilingMissingSymbolsCalloutUploadSymbolsButton')
      .getAttribute('href');
  };

  it('links to the Universal Profiling symbols instructions with the Universal Profiling schema', () => {
    mockSchema = ProfilingSchema.ECS;

    expect(getUploadSymbolsHref()).toBe('/add-data-instructions?selectedTab=symbols');
  });

  it.each([
    ['the OpenTelemetry schema', ProfilingSchema.OTEL],
    ['no schema', undefined],
  ])('links to the add data page without a Universal Profiling tab with %s', (_name, schema) => {
    mockSchema = schema;

    expect(getUploadSymbolsHref()).toBe('/add-data-instructions');
  });
});
