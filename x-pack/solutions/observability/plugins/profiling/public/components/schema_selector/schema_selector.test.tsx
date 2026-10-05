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
import { SchemaSelector } from '.';

const OTHER_SCHEMA_HELP_TEXT = 'There is profiling data available in another schema';
const AVAILABILITY_ERROR_HELP_TEXT = 'Unable to check which schemas have data';

const renderSelector = ({
  value,
  schemas,
  supportedSchemas = [ProfilingSchema.ECS, ProfilingSchema.OTEL],
  isLoading = false,
  hasAvailabilityError = false,
}: {
  value: ProfilingSchema;
  schemas: ProfilingSchema[] | undefined;
  supportedSchemas?: ProfilingSchema[];
  isLoading?: boolean;
  hasAvailabilityError?: boolean;
}) => {
  const onChange = jest.fn();

  render(
    <EuiProvider>
      <I18nProvider>
        <SchemaSelector
          value={value}
          schemas={schemas}
          supportedSchemas={supportedSchemas}
          isLoading={isLoading}
          hasAvailabilityError={hasAvailabilityError}
          onChange={onChange}
        />
      </I18nProvider>
    </EuiProvider>
  );

  return {
    onChange,
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
      value: ProfilingSchema.OTEL,
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('OpenTelemetry');
    expect(screen.getByText(OTHER_SCHEMA_HELP_TEXT)).toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual(['Universal Profiling', 'OpenTelemetry']);
  });

  it('only offers the selected schema when it is the only one with data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      value: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.ECS],
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toHaveTextContent('Universal Profiling');
    expect(screen.queryByText(OTHER_SCHEMA_HELP_TEXT)).not.toBeInTheDocument();

    await openDropdown();

    expect(getOptionLabels()).toEqual(['Universal Profiling']);
  });

  it('flags the selected schema when only the other schema has data', async () => {
    const { openDropdown, getOptionLabels } = renderSelector({
      value: ProfilingSchema.ECS,
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
      value: ProfilingSchema.OTEL,
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
        value: ProfilingSchema.OTEL,
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
        value: ProfilingSchema.OTEL,
        schemas: undefined,
        supportedSchemas: [ProfilingSchema.OTEL],
      });

      await openDropdown();

      expect(getOptionLabels()).toEqual(['OpenTelemetry']);
    });

    it('flags a selected schema the deployment does not support', () => {
      renderSelector({
        value: ProfilingSchema.ECS,
        schemas: undefined,
        supportedSchemas: [ProfilingSchema.OTEL],
      });

      expect(screen.getByTestId('profilingSchemaSelectorInvalidToken')).toBeInTheDocument();
    });

    it('explains when the schemas with data cannot be checked', () => {
      renderSelector({
        value: ProfilingSchema.OTEL,
        schemas: undefined,
        hasAvailabilityError: true,
      });

      expect(screen.getByText(AVAILABILITY_ERROR_HELP_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(OTHER_SCHEMA_HELP_TEXT)).not.toBeInTheDocument();
    });
  });

  it('cannot be changed while the schemas with data are loading', () => {
    renderSelector({
      value: ProfilingSchema.OTEL,
      schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
      isLoading: true,
    });

    expect(screen.getByTestId('profilingSchemaSelect')).toBeDisabled();
  });

  it('selects another schema with data', async () => {
    const { onChange, openDropdown } = renderSelector({
      value: ProfilingSchema.ECS,
      schemas: [ProfilingSchema.OTEL],
    });

    await openDropdown();
    await userEvent.click(screen.getByRole('option', { name: 'OpenTelemetry' }));

    expect(onChange).toHaveBeenCalledWith(ProfilingSchema.OTEL);
  });

  it('does not select the placeholder', async () => {
    const { onChange, openDropdown } = renderSelector({
      value: ProfilingSchema.OTEL,
      schemas: [],
    });

    await openDropdown();
    await userEvent.click(screen.getByRole('option', { name: 'No schema available' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
