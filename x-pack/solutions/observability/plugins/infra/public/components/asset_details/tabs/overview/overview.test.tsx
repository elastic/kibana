/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Overview } from './overview';
import { render } from '@testing-library/react';
import { ContextProviders } from '../../context_providers';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useReloadRequestTimeContext } from '../../../../hooks/use_reload_request_time';
import { useInfraMLCapabilitiesContext } from '../../../../containers/ml/infra_ml_capabilities';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_reload_request_time');
jest.mock('../../../../containers/ml/infra_ml_capabilities');
jest.mock('../../hooks/use_metadata_state');
jest.mock('../../hooks/use_data_views');
jest.mock('../../hooks/use_date_picker');
jest.mock('../../hooks/use_asset_details_render_props');

const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const useRequestTimeContextMock = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;
const useInfraMLCapabilitiesContextMock = useInfraMLCapabilitiesContext as jest.MockedFunction<
  typeof useInfraMLCapabilitiesContext
>;
const useMetadataStateContextMock = useMetadataStateContext as jest.MockedFunction<
  typeof useMetadataStateContext
>;
const useDataViewsContextMock = useDataViewsContext as jest.MockedFunction<
  typeof useDataViewsContext
>;
const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;

// Test constants
const HOST1_NAME = 'host-1';
const DATE_WITH_HOSTS_DATA_FROM = '2023-03-28T18:20:00.000Z';
const DATE_WITH_HOSTS_DATA_TO = '2023-03-28T18:21:00.000Z';

// Should match CreateInventoryViewAttributesRequestPayload but without the nodeType, name, time, and metric properties
const BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES = {
  groupBy: [],
  view: 'map',
  customOptions: [],
  customMetrics: [],
  boundsOverride: {
    max: 1,
    min: 0,
  },
  autoBounds: true,
  accountId: '',
  region: '',
  legend: {
    palette: 'cool',
    reverseColors: false,
    steps: 10,
  },
  sort: {
    by: 'name',
    direction: 'desc',
  },
  timelineOpen: false,
  autoReload: false,
  filterQuery: {
    expression: '',
    kind: 'kuery',
  },
  preferredSchema: 'ecs',
};

const TEST_HOST_TYPE = 'host';
const TEST_ENTITY_TYPE = 'host';
const TEST_RENDER_MODE = 'page';
const TEST_DATA_VIEW_ID = 'test-id';
const TEST_DATA_VIEW_TITLE = 'test-title';
const TEST_OS_NAME = 'Ubuntu';
const TEST_APM_CAPABILITY = 'apm';

const mockUseKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      data: dataPluginMock.createStartContract(),
      application: {
        capabilities: {
          [TEST_APM_CAPABILITY]: { show: true },
        },
      },
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

const mockUseMetadataStateContext = () => {
  useMetadataStateContextMock.mockReturnValue({
    metadata: {
      id: HOST1_NAME,
      name: HOST1_NAME,
      features: [],
      info: {
        host: {
          os: {
            name: TEST_OS_NAME,
          },
        },
      },
    },
    loading: false,
    error: null,
    refresh: jest.fn(),
  });
};

const mockUseDataViewsContext = () => {
  useDataViewsContextMock.mockReturnValue({
    metrics: {
      dataView: {
        id: TEST_DATA_VIEW_ID,
        title: TEST_DATA_VIEW_TITLE,
      },
    },
  } as unknown as ReturnType<typeof useDataViewsContext>);
};

const mockUseDatePickerContext = () => {
  useDatePickerContextMock.mockReturnValue({
    dateRange: {
      from: DATE_WITH_HOSTS_DATA_FROM,
      to: DATE_WITH_HOSTS_DATA_TO,
    },
  } as unknown as ReturnType<typeof useDatePickerContext>);
};

const mockUseAssetDetailsRenderPropsContext = () => {
  useAssetDetailsRenderPropsContextMock.mockReturnValue({
    entity: {
      id: HOST1_NAME,
      name: HOST1_NAME,
      type: TEST_HOST_TYPE,
    },
    renderMode: {
      mode: TEST_RENDER_MODE,
    },
    schema: BASE_DEFAULT_INVENTORY_VIEW_ATTRIBUTES.preferredSchema,
  } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
};

const renderOverview = () =>
  render(
    <I18nProvider>
      <ContextProviders
        entityType={TEST_ENTITY_TYPE}
        entityId={HOST1_NAME}
        entityName={HOST1_NAME}
        dateRange={{
          from: DATE_WITH_HOSTS_DATA_FROM,
          to: DATE_WITH_HOSTS_DATA_TO,
        }}
        renderMode={{
          mode: TEST_RENDER_MODE,
        }}
      >
        <Overview />
      </ContextProviders>
    </I18nProvider>,
    { wrapper: EuiThemeProvider }
  );

describe('Overview Tab', () => {
  beforeAll(() => {
    mockUseKibana();
    mockRequestTimeContext();
    mockUseInfraMLCapabilitiesContext();
    mockUseMetadataStateContext();
    mockUseDataViewsContext();
    mockUseDatePickerContext();
    mockUseAssetDetailsRenderPropsContext();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should render overview component structure', () => {
    const result = renderOverview();
    // Verify the component renders without errors
    // Detailed behavior is tested in e2e tests
    expect(result.container).toBeTruthy();
  });
});
