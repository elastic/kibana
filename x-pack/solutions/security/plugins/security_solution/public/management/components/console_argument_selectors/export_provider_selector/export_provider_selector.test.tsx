/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { act, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../mocks/response_actions_http_mocks';
import { EXPORT_PROVIDERS_ROUTE } from '../../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import type { ArgSelectorState, Command } from '../../console/types';
import type { ParsedCommandInterface } from '../../console/service/types';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { ExportProviderSelectorState } from './export_provider_selector';
import { ExportProviderSelector } from './export_provider_selector';

describe('ExportProviderSelector', () => {
  const testId = 'exportProviderSelector-get-file-0';

  let user: UserEvent;
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let onChange: jest.Mock<void, [ArgSelectorState<ExportProviderSelectorState>]>;
  let render: (initialValue?: string) => ReturnType<AppContextTestRender['render']>;

  const meta: EndpointCommandDefinitionMeta = {
    endpointId: 'agent-1',
    agentType: 'endpoint',
    capabilities: [],
    privileges: { ...getEndpointAuthzInitialStateMock(), loading: false },
    platform: 'linux',
  };

  const command: Command = {
    input: 'get-file --path one --export',
    inputDisplay: 'get-file --path one --export',
    args: {} as ParsedCommandInterface,
    commandDefinition: {
      name: 'get-file',
      about: 'get a file',
      RenderComponent: () => null,
      meta,
      args: {
        export: { required: false, allowMultiples: false, about: 'export' },
      },
    },
  };

  /** Keeps the selector's state the way the console does, so `onChange` updates are rendered */
  const SelectorWithState = ({ initialValue }: { initialValue?: string }) => {
    const [selectorState, setSelectorState] = useState<
      ArgSelectorState<ExportProviderSelectorState>
    >({ value: initialValue, valueText: initialValue ?? '' });

    return (
      <ExportProviderSelector
        value={selectorState.value}
        valueText={selectorState.valueText ?? ''}
        argName="export"
        argIndex={0}
        store={selectorState.store as ExportProviderSelectorState}
        command={command}
        consoleApi={{ setInput: jest.fn(), setFocusOnInput: jest.fn() }}
        onChange={(newState) => {
          onChange(newState);
          setSelectorState(newState);
        }}
      />
    );
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockedContext = createAppRootMockRenderer();
    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    onChange = jest.fn();
    render = (initialValue) => {
      renderResult = mockedContext.render(<SelectorWithState initialValue={initialValue} />);
      return renderResult;
    };
  });

  it('should request the providers of the host and list them with their destination', async () => {
    render();

    await waitFor(() => {
      expect(renderResult.getAllByTestId(`${testId}-provider`)).toHaveLength(2);
    });

    expect(apiMocks.responseProvider.exportProviders).toHaveBeenCalledWith({
      path: EXPORT_PROVIDERS_ROUTE,
      query: { agentId: 'agent-1' },
      version: '1',
    });
    expect(renderResult.getByTestId('azure-1-label')).toHaveTextContent('azure-1');
    expect(renderResult.getByTestId('azure-1-description')).toHaveTextContent(
      'Azure Blob Storage · acct1 / dumps'
    );
    expect(renderResult.getByTestId('azure-2-description')).toHaveTextContent(
      'Azure Blob Storage · acct2 / files'
    );
  });

  it('should set the provider id as the argument value when a provider is selected', async () => {
    render();

    await waitFor(() => {
      expect(renderResult.getAllByTestId(`${testId}-provider`)).toHaveLength(2);
    });
    await user.click(renderResult.getAllByTestId(`${testId}-provider`)[1]);

    await waitFor(() => {
      expect(renderResult.queryByTestId(`${testId}-popoverPanel`)).toBeNull();
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: 'azure-2', valueText: 'azure-2' })
    );
    expect(renderResult.getByTestId(testId)).toHaveTextContent('azure-2');
  });

  it('should show a message when the host policy has no providers', async () => {
    apiMocks.responseProvider.exportProviders.mockReturnValue({ data: [] });
    render();

    // EUI renders the message twice: visible and for screen readers
    await waitFor(() => {
      expect(renderResult.getAllByTestId(`${testId}-emptyMessage`)[0]).toHaveTextContent(
        "No storage providers are configured in this host's Elastic Defend policy. Add one on the policy's Storage providers tab."
      );
    });
    expect(renderResult.queryByRole('link')).toBeNull();
  });

  it('should show an error toast when the providers fail to load', async () => {
    apiMocks.responseProvider.exportProviders.mockImplementation(() => {
      throw new Error('policy not found');
    });
    render();

    await waitFor(() => {
      expect(mockedContext.coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error loading storage providers'),
          text: 'policy not found',
        })
      );
    });
  });

  it('should keep a value from input history that is one of the host providers', async () => {
    render('azure-1');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'azure-1',
          store: expect.objectContaining({
            selectedOption: expect.objectContaining({ id: 'azure-1' }),
          }),
        })
      );
    });
    expect(renderResult.getByTestId(testId)).toHaveTextContent('azure-1');
  });

  it('should clear a value from input history that is not one of the host providers', async () => {
    render('azure-9');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: '', valueText: '' }));
    });
    expect(renderResult.getByTestId(testId)).not.toHaveTextContent('azure-9');
  });

  it('should clear a value from input history when the host policy has no providers', async () => {
    apiMocks.responseProvider.exportProviders.mockReturnValue({ data: [] });
    render('azure-1');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: '', valueText: '' }));
    });
  });

  it('should clear the value when a refreshed list no longer has the provider', async () => {
    render('azure-2');

    await waitFor(() => {
      expect(renderResult.getByTestId(testId)).toHaveTextContent('azure-2');
    });

    apiMocks.responseProvider.exportProviders.mockReturnValue({
      data: [{ id: 'azure-1', type: 'azure_blob', account_name: 'acct1', container: 'dumps' }],
    });
    await act(() => mockedContext.queryClient.invalidateQueries(['get-export-providers']));

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: '', valueText: '' })
      );
    });
    expect(renderResult.getByTestId(testId)).not.toHaveTextContent('azure-2');
  });
});
