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
import {
  AVAILABILITY_ERROR,
  NO_SCHEMA_AVAILABLE,
  OTHER_SCHEMA_AVAILABLE,
  PLACEHOLDER,
  SCHEMA_NOT_AVAILABLE,
  SchemaSelector,
  schemaTranslationMap,
} from '.';

const UNIVERSAL_PROFILING_LABEL = schemaTranslationMap[ProfilingSchema.ECS];
const OPENTELEMETRY_LABEL = schemaTranslationMap[ProfilingSchema.OTEL];

const renderSelector = (
  context: Pick<ProfilingSchemaContextValue, 'selectedSchema' | 'schemas'> &
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
      selectedSchema: ProfilingSchema.OTEL,
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent(OPENTELEMETRY_LABEL);
    expect(screen.getByText(OTHER_SCHEMA_AVAILABLE)).toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual([UNIVERSAL_PROFILING_LABEL, OPENTELEMETRY_LABEL]);
  });

  it('only offers the selected schema when it is the only one with data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      selectedSchema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.ECS],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent(
      UNIVERSAL_PROFILING_LABEL
    );
    expect(screen.queryByText(OTHER_SCHEMA_AVAILABLE)).not.toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual([UNIVERSAL_PROFILING_LABEL]);
  });

  it('flags the selected schema when only the other schema has data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      selectedSchema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.OTEL],
    });

    expect(screen.getByTestId('profilingSchemaSelectorInvalidToken')).toBeInTheDocument();
    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent(
      UNIVERSAL_PROFILING_LABEL
    );
    expect(screen.getByText(OTHER_SCHEMA_AVAILABLE)).toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual([
      `${UNIVERSAL_PROFILING_LABEL}${SCHEMA_NOT_AVAILABLE}`,
      OPENTELEMETRY_LABEL,
    ]);
  });

  it('shows a placeholder when no schema has data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      selectedSchema: ProfilingSchema.OTEL,
      schemas: [],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent(NO_SCHEMA_AVAILABLE);
    expect(screen.queryByText(OTHER_SCHEMA_AVAILABLE)).not.toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual([NO_SCHEMA_AVAILABLE]);
  });

  describe('while the schemas with data are unknown', () => {
    it('offers the supported schemas', async () => {
      const { openDropdown, getOptionLabels } = renderSelector({
        selectedSchema: ProfilingSchema.OTEL,
        schemas: undefined,
      });

      expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent(OPENTELEMETRY_LABEL);
      expect(screen.queryByTestId('profilingSchemaSelectorInvalidToken')).not.toBeInTheDocument();
      expect(screen.queryByText(OTHER_SCHEMA_AVAILABLE)).not.toBeInTheDocument();

      await openDropdown();

      expect(getOptionLabels()).toEqual([UNIVERSAL_PROFILING_LABEL, OPENTELEMETRY_LABEL]);
    });

    it('does not offer Universal Profiling when the deployment does not support it', async () => {
      const { openDropdown, getOptionLabels } = renderSelector({
        selectedSchema: ProfilingSchema.OTEL,
        schemas: undefined,
        supportedSchemas: [ProfilingSchema.OTEL],
      });

      await openDropdown();

      expect(getOptionLabels()).toEqual([OPENTELEMETRY_LABEL]);
    });

    it('flags a selected schema the deployment does not support', () => {
      renderSelector({
        selectedSchema: ProfilingSchema.ECS,
        schemas: undefined,
        supportedSchemas: [ProfilingSchema.OTEL],
      });

      expect(screen.getByTestId('profilingSchemaSelectorInvalidToken')).toBeInTheDocument();
    });

    it('explains when the schemas with data cannot be checked', () => {
      renderSelector({
        selectedSchema: ProfilingSchema.OTEL,
        schemas: undefined,
        error: new Error('Request failed'),
      });

      expect(screen.getByText(AVAILABILITY_ERROR)).toBeInTheDocument();
      expect(screen.queryByText(OTHER_SCHEMA_AVAILABLE)).not.toBeInTheDocument();
    });
  });

  it.each([
    ['while the schemas with data are loading', { schemas: undefined, isLoading: true }],
    ['once the schemas with data are known', { schemas: [ProfilingSchema.ECS], isLoading: false }],
  ])('shows no schema until one is selected, %s', (_description, context) => {
    renderSelector({ selectedSchema: undefined, ...context });

    const select = screen.getByTestId('profilingSchemaSelect');
    expect(select).toHaveTextContent(PLACEHOLDER);
    expect(select).not.toHaveTextContent(OPENTELEMETRY_LABEL);
    expect(select).not.toHaveTextContent(UNIVERSAL_PROFILING_LABEL);
    expect(screen.queryByTestId('profilingSchemaSelectorInvalidToken')).not.toBeInTheDocument();
    expect(select).toBeDisabled();
  });

  it('cannot be changed while the schemas with data are loading', () => {
    renderSelector({
      selectedSchema: ProfilingSchema.OTEL,
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
      isLoading: true,
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toBeDisabled();
  });

  it('selects another schema with data', async () => {
    const { onSchemaChange, openDropdown } = renderSelector({
      selectedSchema: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.OTEL],
    });

    await openDropdown();
    await userEvent.click(screen.getByRole('option', { name: OPENTELEMETRY_LABEL }));

    expect(onSchemaChange).toHaveBeenCalledWith(ProfilingSchema.OTEL);
  });

  it('does not select the placeholder', async () => {
    const { onSchemaChange, openDropdown } = renderSelector({
      selectedSchema: ProfilingSchema.OTEL,
      schemas: [],
    });

    await openDropdown();
    await userEvent.click(screen.getByRole('option', { name: NO_SCHEMA_AVAILABLE }));

    expect(onSchemaChange).not.toHaveBeenCalled();
  });
});
