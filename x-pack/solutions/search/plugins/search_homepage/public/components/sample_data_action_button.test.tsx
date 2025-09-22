/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SampleDataActionButton } from './sample_data_action_button';
import { useKibana } from '../hooks/use_kibana';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useSampleDataStatus } from '../hooks/use_sample_data_status';

jest.mock('../hooks/use_kibana');
jest.mock('../hooks/use_sample_data_status');
jest.mock('../hooks/use_ingest_data', () => ({
  useIngestSampleData: jest.fn().mockImplementation(() => ({
    ingestSampleData: jest.fn(),
    isLoading: false,
  })),
}));

const mockUiSettingsGet = jest.fn();

const renderWithWrapper = () => {
  render(
    <IntlProvider locale="en">
      <SampleDataActionButton />
    </IntlProvider>
  );
};

describe('Sample data action button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders elements when onechat is enabled', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: { get: mockUiSettingsGet },
        share: {
          url: {
            locators: {
              get: () => ({
                navigate: jest.fn(),
              }),
            },
          },
        },
      },
    });
    // Set to make dropdown visible
    (useSampleDataStatus as jest.Mock).mockReturnValue({
      isInstalled: true,
      indexName: 'indexName',
      dashboardId: 'dashboardId',
      isLoading: false,
    });
    mockUiSettingsGet.mockImplementation((key: string) => {
      if (key === AGENT_BUILDER_ENABLED_SETTING_ID) {
        return true;
      }
    });

    renderWithWrapper();

    act(() => {
      fireEvent.click(screen.getByTestId('viewDataBtn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('agentBuilderMenuItem')).toBeInTheDocument();
    });
  });
});
