/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConnectToElasticsearchSidePanel } from './connect_to_elasticsearch_side_panel';
import { useIsSampleDataAvailable } from '../hooks/use_sample_data_is_available';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_sample_data_is_available');
jest.mock('../hooks/use_kibana');
jest.mock('./sample_data_action_button', () => ({
  SampleDataActionButton: () => <div data-test-subj="sampleDataActionButton" />,
}));

const mockUseIsSampleDataAvailable = useIsSampleDataAvailable as jest.MockedFunction<
  typeof useIsSampleDataAvailable
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('ConnectToElasticsearchSidePanel', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
        notifications: {},
      },
    } as any);
  });

  it('renders nothing when sample data is not available but license is ok', () => {
    mockUseIsSampleDataAvailable.mockReturnValue({
      isPluginAvailable: false,
      hasRequiredLicense: true,
      hasPrivileges: true,
      isUsageAvailable: false,
    });

    renderWithIntl(<ConnectToElasticsearchSidePanel />);

    expect(screen.queryByTestId('sampleDataSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sampleDataLicenseUpgrade')).not.toBeInTheDocument();
  });

  it('renders nothing when user has not required privileges', () => {
    mockUseIsSampleDataAvailable.mockReturnValue({
      isPluginAvailable: true,
      hasRequiredLicense: true,
      hasPrivileges: false,
      isUsageAvailable: true,
    });

    renderWithIntl(<ConnectToElasticsearchSidePanel />);

    expect(screen.queryByTestId('sampleDataSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sampleDataLicenseUpgrade')).not.toBeInTheDocument();
  });

  it('renders sample data card when sample data is available', () => {
    mockUseIsSampleDataAvailable.mockReturnValue({
      isPluginAvailable: true,
      hasRequiredLicense: true,
      hasPrivileges: true,
      isUsageAvailable: false,
    });

    renderWithIntl(<ConnectToElasticsearchSidePanel />);

    expect(screen.getByTestId('sampleDataSection')).toBeInTheDocument();
    expect(screen.getByTestId('licenceRequiredBadge')).toBeInTheDocument();
  });
});
