/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '../../../hooks/use_kibana';
import { ConnectionDetails } from './connection_details';

jest.mock('../../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/search-api-keys-components', () => ({
  ApiKeyForm: () => <div data-test-subj="apiKeyFormStub" />,
}));

const renderDetails = (cloud?: { fetchElasticsearchConfig: jest.Mock }) => {
  (useKibana as jest.Mock).mockReturnValue({ services: { cloud } });

  return render(
    <I18nProvider>
      <ConnectionDetails page="home" />
    </I18nProvider>
  );
};

describe('ConnectionDetails', () => {
  it('shows the deployment endpoint next to the API key', async () => {
    renderDetails({
      fetchElasticsearchConfig: jest
        .fn()
        .mockResolvedValue({ elasticsearchUrl: 'https://es.example.test:443' }),
    });

    await waitFor(() =>
      expect(screen.getByTestId('analyticsHomeEndpointValue')).toHaveTextContent(
        'https://es.example.test:443'
      )
    );
    expect(screen.getByTestId('apiKeyFormStub')).toBeInTheDocument();
  });

  it('keeps a placeholder endpoint where the deployment does not report one', async () => {
    const fetchElasticsearchConfig = jest.fn().mockRejectedValue(new Error('unavailable'));
    renderDetails({ fetchElasticsearchConfig });

    await waitFor(() => expect(fetchElasticsearchConfig).toHaveBeenCalled());
    expect(screen.getByTestId('analyticsHomeEndpointValue')).toHaveTextContent(
      'https://your_deployment_url'
    );
  });

  it('keeps a placeholder endpoint without the cloud plugin', () => {
    renderDetails();

    expect(screen.getByTestId('analyticsHomeEndpointValue')).toHaveTextContent(
      'https://your_deployment_url'
    );
  });
});
