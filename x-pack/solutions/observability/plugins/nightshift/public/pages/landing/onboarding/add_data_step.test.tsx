/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ADD_DATA_TITLE, OnboardingAddDataStep } from './add_data_step';

jest.mock('../../../components/entities/sandbox_connector/connect_sources_grid', () => ({
  ConnectSourcesGrid: ({ group, trailing }: { group: string; trailing?: React.ReactNode }) => (
    <div data-test-subj={`grid-${group}`}>{trailing}</div>
  ),
}));
jest.mock('../../../components/entities/sandbox_connector/add_data_card', () => ({
  AddDataCard: () => <div data-test-subj="addDataCardStub" />,
}));

describe('OnboardingAddDataStep', () => {
  it('is titled Add data', () => {
    expect(ADD_DATA_TITLE).toBe('Add data');
  });

  it('shows the telemetry types and the Add data card', () => {
    render(
      <I18nProvider>
        <OnboardingAddDataStep />
      </I18nProvider>
    );

    expect(screen.getByTestId('grid-telemetry')).toBeInTheDocument();
    expect(screen.getByTestId('addDataCardStub')).toBeInTheDocument();
  });
});
