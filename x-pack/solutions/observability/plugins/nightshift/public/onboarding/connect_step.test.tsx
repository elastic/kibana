/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';
import { ConnectSourcesGrid } from '../sandbox_connectors/connect_sources_grid';
import { OnboardingConnectStep } from './connect_step';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../sandbox_connectors/connect_sources_grid', () => ({
  ConnectSourcesGrid: jest.fn(({ group, trailing }) => (
    <div data-test-subj={`grid-${group}`}>{trailing}</div>
  )),
}));
jest.mock('../sandbox_connectors/add_data_card', () => ({
  AddDataCard: () => <div data-test-subj="addDataCardStub" />,
}));
jest.mock('../settings/components/apps_section', () => ({
  SlackAppCard: () => <div data-test-subj="slackCardStub" />,
}));
jest.mock('../custom_context/use_fetch_custom_context', () => ({
  useFetchCustomContext: () => ({ data: undefined, error: new Error('off') }),
}));

const mockConnectSourcesGrid = ConnectSourcesGrid as jest.Mock;

beforeEach(() => {
  (useKibana as jest.Mock).mockReturnValue({
    services: { application: { capabilities: { nightshift: {} } } },
  });
});

describe('OnboardingConnectStep', () => {
  it('starts with the telemetry types and the Add data card', () => {
    render(
      <I18nProvider>
        <OnboardingConnectStep subStep="telemetry" />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftOnboardingTelemetry')).toHaveTextContent(
      'Add telemetry data'
    );
    expect(screen.getByTestId('grid-telemetry')).toBeInTheDocument();
    expect(screen.getByTestId('addDataCardStub')).toBeInTheDocument();
    expect(screen.queryByTestId('slackCardStub')).not.toBeInTheDocument();
  });

  it('follows with the other types, Slack and hints as additional sources', () => {
    render(
      <I18nProvider>
        <OnboardingConnectStep subStep="additional" />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftOnboardingAdditionalSources')).toHaveTextContent(
      'Connect other sources'
    );
    expect(screen.getByTestId('grid-additional')).toBeInTheDocument();
    expect(mockConnectSourcesGrid).toHaveBeenLastCalledWith(
      expect.objectContaining({ group: 'additional' }),
      expect.anything()
    );
    expect(screen.getByTestId('slackCardStub')).toBeInTheDocument();
    expect(screen.queryByTestId('addDataCardStub')).not.toBeInTheDocument();
  });
});
