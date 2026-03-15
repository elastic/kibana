/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { AssetCriticalityTab } from './asset_criticality_tab';

import {
  ASSET_CRITICALITY_ISSUE_CALLOUT_TEST_ID,
  ASSET_CRITICALITY_INSUFFICIENT_PRIVILEGES_TEST_ID,
  ASSET_CRITICALITY_FILE_UPLOAD_SECTION_TEST_ID,
  ASSET_CRITICALITY_INFO_PANEL_TEST_ID,
  ASSET_CRITICALITY_DOC_LINK_TEST_ID,
} from '../../test_ids';

const mockUseAssetCriticalityPrivileges = jest.fn();
jest.mock('./use_asset_criticality', () => ({
  useAssetCriticalityPrivileges: (...args: unknown[]) => mockUseAssetCriticalityPrivileges(...args),
}));

const mockUseHasSecurityCapability = jest.fn();
jest.mock('../../../helper_hooks', () => ({
  useHasSecurityCapability: (...args: unknown[]) => mockUseHasSecurityCapability(...args),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      docLinks: {
        links: {
          securitySolution: {
            entityAnalytics: {
              assetCriticality: 'https://example.com/asset-criticality',
            },
          },
        },
      },
    },
  }),
}));

jest.mock('../asset_criticality_file_uploader/asset_criticality_file_uploader', () => ({
  AssetCriticalityFileUploader: () => <div data-test-subj="asset-criticality-file-uploader" />,
}));

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('AssetCriticalityTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: false,
      data: { has_write_permissions: true },
      error: null,
    });
  });

  it('renders nothing in the file upload section while loading', () => {
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    });
    render(<AssetCriticalityTab />, { wrapper: Wrapper });

    expect(screen.queryByTestId('asset-criticality-file-uploader')).not.toBeInTheDocument();
    expect(screen.queryByTestId(ASSET_CRITICALITY_ISSUE_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(ASSET_CRITICALITY_INSUFFICIENT_PRIVILEGES_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('shows issue callout when entity-analytics capability is missing', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    render(<AssetCriticalityTab />, { wrapper: Wrapper });

    expect(screen.getByTestId(ASSET_CRITICALITY_ISSUE_CALLOUT_TEST_ID)).toBeInTheDocument();
  });

  it('shows issue callout with error message on 403 privileges error', () => {
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: { body: { status_code: 403, message: 'Forbidden by server' } },
    });
    render(<AssetCriticalityTab />, { wrapper: Wrapper });

    expect(screen.getByTestId(ASSET_CRITICALITY_ISSUE_CALLOUT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Forbidden by server')).toBeInTheDocument();
  });

  it('shows insufficient privileges callout when write permissions are missing', () => {
    mockUseAssetCriticalityPrivileges.mockReturnValue({
      isLoading: false,
      data: { has_write_permissions: false },
      error: null,
    });
    render(<AssetCriticalityTab />, { wrapper: Wrapper });

    expect(
      screen.getByTestId(ASSET_CRITICALITY_INSUFFICIENT_PRIVILEGES_TEST_ID)
    ).toBeInTheDocument();
  });

  it('renders the file uploader when all permissions are met', () => {
    render(<AssetCriticalityTab />, { wrapper: Wrapper });

    expect(screen.getByTestId(ASSET_CRITICALITY_FILE_UPLOAD_SECTION_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('asset-criticality-file-uploader')).toBeInTheDocument();
  });

  it('always renders the info panel regardless of permission state', () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    render(<AssetCriticalityTab />, { wrapper: Wrapper });

    expect(screen.getByTestId(ASSET_CRITICALITY_INFO_PANEL_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(ASSET_CRITICALITY_DOC_LINK_TEST_ID)).toBeInTheDocument();
  });
});
