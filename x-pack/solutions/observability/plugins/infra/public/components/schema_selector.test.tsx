/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { SchemaSelector } from './schema_selector';

const mockReportSchemaSelectorInteraction = jest.fn();

jest.mock('../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      telemetry: {
        reportSchemaSelectorInteraction: mockReportSchemaSelectorInteraction,
      },
    },
  }),
}));

const renderSelector = (
  props: Partial<React.ComponentProps<typeof SchemaSelector>> &
    Pick<React.ComponentProps<typeof SchemaSelector>, 'value' | 'schemas'>
) => {
  const onChange = props.onChange ?? jest.fn();
  return render(
    <EuiProvider>
      <I18nProvider>
        <SchemaSelector
          onChange={onChange}
          schemas={props.schemas}
          value={props.value}
          isLoading={props.isLoading ?? false}
          nodeType={props.nodeType ?? 'pod'}
        />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('SchemaSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the invalid token when preferredSchema is missing from available schemas', () => {
    const onChange = jest.fn();
    renderSelector({ value: 'semconv', schemas: ['ecs'], onChange });

    expect(screen.getByTestId('infraSchemaSelectorInvalidToken')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
