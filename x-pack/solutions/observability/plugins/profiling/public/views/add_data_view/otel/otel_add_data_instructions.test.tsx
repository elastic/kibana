/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    start: {
      core: {
        application: {
          getUrlForApp: (appId: string, { path }: { path: string }) => `/base/app/${appId}${path}`,
        },
      },
    },
  }),
}));

import { OtelAddDataInstructions } from './otel_add_data_instructions';

describe('OtelAddDataInstructions', () => {
  it('links to the OpenTelemetry Profiling integration', () => {
    render(<OtelAddDataInstructions />);

    expect(screen.getByTestId('profilingAddDataViewOtelIntegrationButton')).toHaveAttribute(
      'href',
      '/base/app/integrations/detail/profiling_otel/overview'
    );
  });
});
