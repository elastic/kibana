/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Metadata } from './metadata';
import { useMetadata } from '../../hooks/use_metadata';
import { useSourceContext } from '../../../../containers/metrics_source';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { ContextProviders } from '../../context_providers';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useReloadRequestTimeContext } from '../../../../hooks/use_reload_request_time';
import { useInfraMLCapabilitiesContext } from '../../../../containers/ml/infra_ml_capabilities';

jest.mock('../../../../containers/metrics_source');
jest.mock('../../hooks/use_metadata');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_reload_request_time');
jest.mock('../../../../containers/ml/infra_ml_capabilities');

const useInfraMLCapabilitiesContextMock = useInfraMLCapabilitiesContext as jest.MockedFunction<
  typeof useInfraMLCapabilitiesContext
>;

const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const useRequestTimeContextMock = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;

const mockUseKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      data: dataPluginMock.createStartContract(),
    },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
};

const mockRequestTimeContext = () => {
  useRequestTimeContextMock.mockReturnValue({
    updateReloadRequestTime: jest.fn(),
    reloadRequestTime: 0,
  });
};

const mockUseInfraMLCapabilitiesContext = () => {
  useInfraMLCapabilitiesContextMock.mockReturnValue({
    updateTopbarMenuVisibilityBySchema: jest.fn(),
  } as unknown as ReturnType<typeof useInfraMLCapabilitiesContext>);
};

const mockUseMetadata = (props: any = {}) => {
  const data = {
    ...props.data,
  };
  (useMetadata as jest.Mock).mockReturnValue({
    ...props,
    data,
  });
};

const renderHostMetadata = () =>
  render(
    <I18nProvider>
      <ContextProviders
        entityType="host"
        entityId="host-1"
        entityName="host-1"
        overrides={{
          metadata: {
            showActionsColumn: true,
          },
        }}
        dateRange={{
          from: '2023-04-09T11:07:49Z',
          to: '2023-04-09T11:23:49Z',
        }}
        renderMode={{
          mode: 'page',
        }}
      >
        <Metadata />
      </ContextProviders>
    </I18nProvider>,
    { wrapper: EuiThemeProvider }
  );

describe('Single Host Metadata (Hosts View)', () => {
  beforeAll(() => {
    (useSourceContext as jest.Mock).mockReturnValue({ sourceId: '123' });
    mockUseKibana();
    mockRequestTimeContext();
    mockUseInfraMLCapabilitiesContext();
    jest.useFakeTimers();
  });

  beforeEach(() => {
    mockUseMetadata();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should show an error if fetching the metadata returns error', async () => {
    mockUseMetadata({ error: 'Internal server error' });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataErrorCallout')).toBeInTheDocument();
  });

  it('should show an no data message if fetching the metadata returns an empty array', async () => {
    mockUseMetadata({ metadata: [] });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataSearchBarInput')).toBeInTheDocument();
    expect(result.queryByTestId('infraAssetDetailsMetadataNoData')).toBeInTheDocument();
  });

  it('should show the metadata table if metadata is returned', async () => {
    mockUseMetadata({ metadata: [{ name: 'host.os.name', value: 'Ubuntu' }] });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataSearchBarInput')).toBeInTheDocument();
    expect(result.queryByTestId('infraAssetDetailsMetadataTable')).toBeInTheDocument();
  });

  it('should return loading text if loading', async () => {
    mockUseMetadata({ loading: true });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataSearchBarInput')).toBeInTheDocument();
    expect(result.queryByTestId('infraAssetDetailsMetadataLoading')).toBeInTheDocument();
  });
});
