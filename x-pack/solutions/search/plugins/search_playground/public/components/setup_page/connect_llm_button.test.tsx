/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as testingLibraryRender, waitFor } from '@testing-library/react';
import { ConnectLLMButton } from './connect_llm_button';
import { useKibana } from '../../hooks/use_kibana';
import { useLoadConnectors } from '../../hooks/use_load_connectors';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { LLMs } from '../../../common/types';

const render = (children: React.ReactNode) =>
  testingLibraryRender(<IntlProvider locale="en">{children}</IntlProvider>);

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_load_connectors');
jest.mock('../../hooks/use_usage_tracker', () => ({
  useUsageTracker: () => ({
    count: jest.fn(),
    load: jest.fn(),
    click: jest.fn(),
  }),
}));

const mockConnectors = {
  '1': { title: 'Connector 1' },
  '2': { title: 'Connector 2' },
};

const mockEisConnectors = {
  id: 'connectorId4',
  name: 'Elastic Managed LLM',
  type: LLMs.inference,
};

describe('ConnectLLMButton', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        triggersActionsUi: {
          getAddConnectorFlyout: () => (
            <div data-test-subj="addConnectorFlyout">Add Connector Flyout</div>
          ),
        },
      },
    });
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: mockConnectors,
      refetch: jest.fn(),
      isLoading: false,
      isSuccess: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the empty state when there are no connectors', () => {
    (useLoadConnectors as jest.Mock).mockReturnValueOnce({
      data: {},
      isLoading: false,
      isSuccess: true,
    });
    const { getByTestId, getByText } = render(<ConnectLLMButton />);
    expect(getByTestId('connectLLMButton')).toBeInTheDocument();
    expect(getByText('Connect to an LLM')).toBeInTheDocument();
  });

  it('show the flyout when the button is clicked', async () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: {},
      isLoading: false,
      isSuccess: true,
    });
    const { getByTestId, queryByTestId } = render(<ConnectLLMButton />);

    expect(queryByTestId('addConnectorFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('connectLLMButton'));
    await waitFor(() => expect(getByTestId('addConnectorFlyout')).toBeInTheDocument());
  });

  it('show the flyout when manageConnectorsLink is clicked', async () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [
        {
          name: 'conn-1',
          type: LLMs.openai,
        },
      ],
      isLoading: false,
      isSuccess: true,
    });
    const { getByTestId, queryByTestId } = render(<ConnectLLMButton />);

    expect(queryByTestId('addConnectorFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('manageConnectorsLink'));
    await waitFor(() => expect(getByTestId('addConnectorFlyout')).toBeInTheDocument());
  });

  it('show success text when connector exists', async () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [
        {
          name: 'conn-1',
          type: LLMs.openai,
        },
      ],
      isLoading: false,
      isSuccess: true,
    });
    const { queryByTestId, getByText } = render(<ConnectLLMButton />);

    expect(queryByTestId('successConnectLLMText')).toBeInTheDocument();
    expect(getByText('conn-1 connected')).toBeInTheDocument();
  });

  it('show success text when EIS connector exists', async () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [mockEisConnectors],
      isLoading: false,
      isSuccess: true,
    });
    const { queryByTestId, getByText } = render(<ConnectLLMButton />);

    expect(queryByTestId('successConnectLLMText')).toBeInTheDocument();
    expect(getByText('Elastic Managed LLM connected')).toBeInTheDocument();
  });
});
