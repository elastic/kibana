/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import type { ProfilingSchemaContextValue } from '../contexts/profiling_schema/profiling_schema_context';
import { ProfilingSchemaContext } from '../contexts/profiling_schema/profiling_schema_context';
import { SchemaSelector } from '.';

const OTHER_SCHEMA_HELP_TEXT = 'There is profiling data available in another schema';
const AVAILABILITY_ERROR_HELP_TEXT = 'Unable to check which schemas have data';

const renderSelector = (
  context: Pick<ProfilingSchemaContextValue, 'schema' | 'schemas'> &
    Partial<Pick<ProfilingSchemaContextValue, 'supportedSchemas' | 'isLoading' | 'error'>>
) => {
  const onSchemaChange = jest.fn();

  render(
    <EuiProvider>
      <I18nProvider>
        <ProfilingSchemaContext.Provider
          value={{
            supportedSchemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
            isLoading: false,
            onSchemaChange,
            ...context,
          }}
        >
          <SchemaSelector />
        </ProfilingSchemaContext.Provider>
      </I18nProvider>
    </EuiProvider>
  );

  return {
    onSchemaChange,
    openDropdown: async () => {
      await userEvent.click(screen.getByTestId('profilingSchemaSelect'));
      await waitForEuiPopoverOpen();
    },
    getOptionLabels: () => screen.getAllByRole('option').map((option) => option.textContent),
  };
};

describe('SchemaSelector', () => {
  it('offers both schemas when both have data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      schema: ProfilingSchema.OTEL,
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('OpenTelemetry');
    expect(screen.getByText(OTHER_SCHEMA_HELP_TEXT)).toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual(['Universal Profiling', 'OpenTelemetry']);
  });

  it('only offers the selected schema when it is the only one with data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      schema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.ECS],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('Universal Profiling');
    expect(screen.queryByText(OTHER_SCHEMA_HELP_TEXT)).not.toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual(['Universal Profiling']);
  });

  it('flags the selected schema when only the other schema has data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      schema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.OTEL],
    });

    expect(screen.getByTestId('profilingSchemaSelectorInvalidToken')).toBeInTheDocument();
    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('Universal Profiling');
    expect(screen.getByText(OTHER_SCHEMA_HELP_TEXT)).toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual([
      'Universal ProfilingSelected schema is not available for this query.',
      'OpenTelemetry',
    ]);
  });

  it('shows a placeholder when no schema has data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      schema: ProfilingSchema.OTEL,
      schemas: [],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('No schema available');
    expect(screen.queryByText(OTHER_SCHEMA_HELP_TEXT)).not.toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual(['No schema available']);
  });

  describe('while the schemas with data are unknown', () => {
    it('offers the supported schemas', async () => {
      const { openDropdown, getOptionLabels } = renderSelector({
        schema: ProfilingSchema.OTEL,
        schemas: undefined,
      });

      expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('OpenTelemetry');
      expect(screen.queryByTestId('profilingSchemaSelectorInvalidToken')).not.toBeInTheDocument();
      expect(screen.queryByText(OTHER_SCHEMA_HELP_TEXT)).not.toBeInTheDocument();

      await openDropdown();

      expect(getOptionLabels()).toEqual(['Universal Profiling', 'OpenTelemetry']);
    });

    it('does not offer Universal Profiling when the deployment does not support it', async () => {
      const { openDropdown, getOptionLabels } = renderSelector({
        schema: ProfilingSchema.OTEL,
        schemas: undefined,
        supportedSchemas: [ProfilingSchema.OTEL],
      });

      await openDropdown();

      expect(getOptionLabels()).toEqual(['OpenTelemetry']);
    });

    it('flags a selected schema the deployment does not support', () => {
      renderSelector({
        schema: ProfilingSchema.ECS,
        schemas: undefined,
        supportedSchemas: [ProfilingSchema.OTEL],
      });

      expect(screen.getByTestId('profilingSchemaSelectorInvalidToken')).toBeInTheDocument();
    });

    it('explains when the schemas with data cannot be checked', () => {
      renderSelector({
        schema: ProfilingSchema.OTEL,
        schemas: undefined,
        error: new Error('Request failed'),
      });

      expect(screen.getByText(AVAILABILITY_ERROR_HELP_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(OTHER_SCHEMA_HELP_TEXT)).not.toBeInTheDocument();
    });
  });

  it('shows the default schema until one is selected', () => {
    renderSelector({ schema: undefined, schemas: undefined, isLoading: true });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('OpenTelemetry');
    expect(screen.getByTestId('profilingSchemaSelect')).toBeDisabled();
  });

  it('cannot be changed while the schemas with data are loading', () => {
    renderSelector({
      schema: ProfilingSchema.OTEL,
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
      isLoading: true,
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toBeDisabled();
  });

  it('selects another schema with data', async () => {
    const { onSchemaChange, openDropdown } = renderSelector({
      schema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.OTEL],
    });

    await openDropdown();
    await userEvent.click(screen.getByRole('option', { name: 'OpenTelemetry' }));

    expect(onSchemaChange).toHaveBeenCalledWith(ProfilingSchema.OTEL);
  });

  it('does not select the placeholder', async () => {
    const { onSchemaChange, openDropdown } = renderSelector({
      schema: ProfilingSchema.OTEL,
      schemas: [],
    });

    await openDropdown();
    await userEvent.click(screen.getByRole('option', { name: 'No schema available' }));

    expect(onSchemaChange).not.toHaveBeenCalled();
  });
});
