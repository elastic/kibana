/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import { SummarizationModel } from './summarization_model';
import { useManagementLink } from '../../hooks/use_management_link';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { LLMs } from '../../types';

const render = (children: React.ReactNode) =>
  testingLibraryRender(<IntlProvider locale="en">{children}</IntlProvider>);
const MockIcon = () => <span />;

jest.mock('../../hooks/use_management_link');
jest.mock('../../hooks/use_usage_tracker', () => ({
  useUsageTracker: () => ({
    count: jest.fn(),
    load: jest.fn(),
    click: jest.fn(),
  }),
}));

const mockUseManagementLink = useManagementLink as jest.Mock;

describe('SummarizationModel', () => {
  beforeEach(() => {
    mockUseManagementLink.mockReturnValue('http://example.com/manage-connectors');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly with models', () => {
    const models = [
      {
        id: 'model1',
        name: 'Model1',
        disabled: false,
        icon: MockIcon,
        connectorId: 'connector1',
        connectorName: 'nameconnector1',
        connectorType: LLMs.openai_azure,
      },
      {
        id: 'model2',
        name: 'Model2',
        disabled: true,
        icon: MockIcon,
        connectorId: 'connector2',
        connectorName: 'nameconnector2',
        connectorType: LLMs.openai,
      },
    ];
    const { getByTestId } = render(
      <SummarizationModel selectedModel={models[1]} models={models} onSelect={jest.fn()} />
    );

    expect(getByTestId('summarizationModelSelect')).toBeInTheDocument();
  });
});
