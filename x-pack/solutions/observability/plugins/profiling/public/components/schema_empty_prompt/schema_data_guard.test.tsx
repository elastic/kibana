/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import type { ProfilingSchemaContextValue } from '../contexts/profiling_schema/profiling_schema_context';
import { ProfilingSchemaContext } from '../contexts/profiling_schema/profiling_schema_context';
import { SchemaDataGuard } from './schema_data_guard';

const renderGuard = (context: Pick<ProfilingSchemaContextValue, 'schema' | 'schemas'>) =>
  render(
    <I18nProvider>
      <ProfilingSchemaContext.Provider
        value={{
          supportedSchemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
          isLoading: false,
          onSchemaChange: jest.fn(),
          ...context,
        }}
      >
        <SchemaDataGuard>
          <div data-test-subj="pageContent" />
        </SchemaDataGuard>
      </ProfilingSchemaContext.Provider>
    </I18nProvider>
  );

describe('SchemaDataGuard', () => {
  it('renders the page when the selected schema has data', () => {
    renderGuard({ schema: ProfilingSchema.ECS, schemas: [ProfilingSchema.ECS] });

    expect(screen.getByTestId('pageContent')).toBeInTheDocument();
    expect(screen.queryByTestId('profilingSchemaEmptyPrompt')).not.toBeInTheDocument();
  });

  it.each([
    ['no schema is selected yet', { schema: undefined, schemas: [] }],
    ['the schemas with data are unknown', { schema: ProfilingSchema.OTEL, schemas: undefined }],
  ])('renders the page when %s', (_description, context) => {
    renderGuard(context);

    expect(screen.getByTestId('pageContent')).toBeInTheDocument();
  });

  it.each([
    [
      'only the other schema has data',
      { schema: ProfilingSchema.ECS, schemas: [ProfilingSchema.OTEL] },
    ],
    ['no schema has data', { schema: ProfilingSchema.OTEL, schemas: [] }],
  ])('renders the empty prompt instead of the page when %s', (_description, context) => {
    renderGuard(context);

    expect(screen.queryByTestId('pageContent')).not.toBeInTheDocument();
    expect(screen.getByTestId('profilingSchemaEmptyPrompt')).toHaveTextContent(
      'No profiling data foundTry updating your search filters or selecting a different time range or schema'
    );
  });
});
