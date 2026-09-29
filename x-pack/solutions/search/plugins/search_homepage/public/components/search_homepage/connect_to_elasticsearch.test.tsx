/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';

import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { act, render } from '@testing-library/react';
import { Status, useSearchApiKey } from '@kbn/search-api-keys-components';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';

// jest.mock('../../hooks/use_kibana');
vi.mock('../../hooks/use_elasticsearch_url', () => {
      const mocked = {
      useElasticsearchUrl: vi.fn().mockReturnValue('https://local_dev.es.fake.elstc.co:443'),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/search-api-keys-components', () => {
      const mocked = {
      // Assume you have permissions as default
      useSearchApiKey: vi.fn().mockReturnValue({ status: 'showHiddenKey' }),
      Status: {
        showHiddenKey: 'showHiddenKey',
        showUserPrivilegesError: 'showUserPrivilegesError',
      },
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/cloud/connection_details', () => {
      const mocked = {
      openWiredConnectionDetails: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const queryClient = new QueryClient();
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </I18nProvider>
);

const mockUseSearchApiKey = useSearchApiKey as Mock;
const mockOpenWiredConnectionDetails = openWiredConnectionDetails as Mock;

describe('Connection details block', () => {
  it('should render all elements correctly when all permissions are present', () => {
    const { getByTestId } = render(<ConnectToElasticsearch />, { wrapper: Wrapper });

    const endpointField = getByTestId('endpointValueField');
    const apiKeyButton = getByTestId('searchHomepageConnectToElasticsearchApiKeysButton');
    const connectionDetailsButton = getByTestId(
      'searchHomepageConnectToElasticsearchConnectionDetailsButton'
    );
    expect(endpointField).toHaveTextContent('https://local_dev.es.fake.elstc.co:443');
    expect(apiKeyButton).toHaveTextContent('API keys');
    expect(apiKeyButton).toBeEnabled();
    expect(connectionDetailsButton).toBeEnabled();

    act(() => {
      connectionDetailsButton.click();
    });
    expect(mockOpenWiredConnectionDetails).toHaveBeenCalledTimes(1);
    expect(mockOpenWiredConnectionDetails).toHaveBeenCalledWith();

    act(() => {
      apiKeyButton.click();
    });
    expect(mockOpenWiredConnectionDetails).toHaveBeenCalledTimes(2);
    expect(mockOpenWiredConnectionDetails.mock.calls[1][0]).toEqual({
      props: { options: { defaultTabId: 'apiKeys' } },
    });
  });

  it('should disable API keys button when user lacks permissions', () => {
    mockUseSearchApiKey.mockReturnValue({ status: Status.showUserPrivilegesError });
    const { getByTestId } = render(<ConnectToElasticsearch />, { wrapper: Wrapper });

    const apiKeyButton = getByTestId('searchHomepageConnectToElasticsearchApiKeysButton');
    expect(apiKeyButton).toBeDisabled();
  });
});
