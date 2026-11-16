/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CONNECT_SOURCES_TITLE, OnboardingConnectSourcesStep } from './connect_sources_step';

jest.mock('../../../components/entities/sandbox_connector/connect_sources_grid', () => ({
  ...jest.requireActual('../../../components/entities/sandbox_connector/connect_sources_grid'),
  ConnectSourcesGrid: ({
    filter,
    trailing,
  }: {
    filter: (id: string) => boolean;
    trailing?: React.ReactNode;
  }) => <div data-test-subj={`grid-${filter.name}`}>{trailing}</div>,
}));

describe('OnboardingConnectSourcesStep', () => {
  it('is titled Connect other sources', () => {
    expect(CONNECT_SOURCES_TITLE).toBe('Connect other sources');
  });

  it('shows the additional types and nothing else', () => {
    render(
      <I18nProvider>
        <OnboardingConnectSourcesStep />
      </I18nProvider>
    );

    expect(screen.getByTestId('grid-isAdditionalType')).toBeEmptyDOMElement();
  });
});
