/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CreateIndexForm } from './create_index_form';
import { useIsSampleDataAvailable } from '../../hooks/use_is_sample_data_available';
import { useIngestSampleData } from '../../hooks/use_ingest_data';

jest.mock('../../hooks/use_is_sample_data_available');
jest.mock('../../hooks/use_ingest_data');
jest.mock('../../contexts/usage_tracker_context', () => ({
  useUsageTracker: () => ({ click: jest.fn() }),
}));
jest.mock('./sample_data_panel', () => ({
  SampleDataPanel: () => <div data-test-subj="sampleDataPanel" />,
}));

const mockUseIsSampleDataAvailable = useIsSampleDataAvailable as jest.MockedFunction<
  typeof useIsSampleDataAvailable
>;
const mockUseIngestSampleData = useIngestSampleData as jest.MockedFunction<
  typeof useIngestSampleData
>;

const baseProps = {
  indexName: 'test-index',
  indexNameHasError: false,
  isLoading: false,
  onCreateIndex: jest.fn(),
  onFileUpload: jest.fn(),
  onIndexNameChange: jest.fn(),
  showAPIKeyCreateLabel: false,
  userPrivileges: { privileges: { canManageIndex: true } } as any,
};

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('CreateIndexForm – sample data availability/license', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseIngestSampleData.mockReturnValue({
      ingestSampleData: jest.fn(),
      isLoading: false,
    } as any);
  });

  it('shows SampleDataPanel when sample data is available and license is sufficient', () => {
    mockUseIsSampleDataAvailable.mockReturnValue({
      isPluginAvailable: true,
      isUsageAvailable: true,
      hasPrivileges: true,
      hasRequiredLicense: true,
    });

    renderWithIntl(<CreateIndexForm {...baseProps} />);

    expect(screen.getByTestId('sampleDataPanel')).toBeInTheDocument();
  });

  it('shows nothing when plugin is not available', () => {
    mockUseIsSampleDataAvailable.mockReturnValue({
      isPluginAvailable: false,
      isUsageAvailable: false,
      hasPrivileges: true,
      hasRequiredLicense: true,
    });

    renderWithIntl(<CreateIndexForm {...baseProps} />);

    expect(screen.queryByTestId('sampleDataPanel')).not.toBeInTheDocument();
  });

  it('shows nothing when user has not required privileges is not available', () => {
    mockUseIsSampleDataAvailable.mockReturnValue({
      isPluginAvailable: true,
      isUsageAvailable: false,
      hasPrivileges: false,
      hasRequiredLicense: true,
    });

    renderWithIntl(<CreateIndexForm {...baseProps} />);

    expect(screen.queryByTestId('sampleDataPanel')).not.toBeInTheDocument();
  });
});
