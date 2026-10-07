/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Metadata } from './metadata';
import { render, screen, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../../../pages/metrics/hosts/hooks/use_unified_search';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

jest.mock('../../hooks/use_metadata_state');
jest.mock('../../hooks/use_asset_details_render_props');
jest.mock('../../hooks/use_asset_details_url_state');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../pages/metrics/hosts/hooks/use_unified_search');
jest.mock('../../hooks/use_data_views');

const useMetadataStateContextMock = useMetadataStateContext as jest.MockedFunction<
  typeof useMetadataStateContext
>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;
const useAssetDetailsUrlStateMock = useAssetDetailsUrlState as jest.MockedFunction<
  typeof useAssetDetailsUrlState
>;
const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const useUnifiedSearchContextMock = useUnifiedSearchContext as jest.MockedFunction<
  typeof useUnifiedSearchContext
>;
const useDataViewsContextMock = useDataViewsContext as jest.MockedFunction<
  typeof useDataViewsContext
>;

const defaultRenderProps = {
  entity: { id: 'host-1', name: 'host-1', type: 'host' as const },
  overrides: { metadata: { showActionsColumn: true } },
  schema: 'ecs' as const,
  renderMode: { mode: 'page' as const },
  loading: false,
};

const mockRenderPropsContext = (overrides: Partial<typeof defaultRenderProps> = {}) => {
  useAssetDetailsRenderPropsContextMock.mockReturnValue({
    ...defaultRenderProps,
    ...overrides,
  } as ReturnType<typeof useAssetDetailsRenderPropsContext>);
};

const mockUrlState = (urlState: Record<string, unknown> | null = null) => {
  useAssetDetailsUrlStateMock.mockReturnValue([urlState, jest.fn()] as ReturnType<
    typeof useAssetDetailsUrlState
  >);
};

const mockMetadataState = (props: Partial<ReturnType<typeof useMetadataStateContext>> = {}) => {
  const defaults: ReturnType<typeof useMetadataStateContext> = {
    loading: false,
    error: null,
    metadata: {
      id: 'host-1',
      name: 'host-1',
      features: [],
      info: {
        host: {
          os: {
            name: 'Ubuntu',
          },
        },
      },
    },
    refresh: jest.fn(),
  };
  useMetadataStateContextMock.mockReturnValue({ ...defaults, ...props });
};

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...coreMock.createStart(),
      data: dataPluginMock.createStartContract(),
    },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
};

const mockUnifiedSearch = () => {
  useUnifiedSearchContextMock.mockReturnValue({
    searchCriteria: { filters: [] },
  } as unknown as ReturnType<typeof useUnifiedSearchContext>);
};

const mockDataViews = () => {
  useDataViewsContextMock.mockReturnValue({
    metrics: { dataView: {} },
  } as unknown as ReturnType<typeof useDataViewsContext>);
};

const LOCAL_STORAGE_PINNED_METADATA_ROWS = 'hostsView:pinnedMetadataRows';

const hostMetadataWithFields = {
  id: 'host-1',
  name: 'host-1',
  features: [],
  info: {
    host: {
      os: {
        name: 'Ubuntu',
      },
      hostname: 'host-1',
    },
    cloud: {
      provider: 'aws',
    },
  },
};

const renderHostMetadata = () =>
  render(
    <I18nProvider>
      <Metadata />
    </I18nProvider>
  );

describe('Single Host Metadata (Hosts View)', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    localStorage.clear();
    mockRenderPropsContext();
    mockUrlState();
    mockMetadataState();
    mockKibana();
    mockUnifiedSearch();
    mockDataViews();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should show an error if fetching the metadata returns error', async () => {
    mockMetadataState({ error: 'Internal server error' });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataErrorCallout')).toBeInTheDocument();
  });

  it('should show a no data message if fetching the metadata returns an empty array', async () => {
    mockMetadataState({
      metadata: {
        id: 'host-1',
        name: 'host-1',
        features: [],
      },
    });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataNoData')).toBeInTheDocument();
  });

  it('should show the metadata table if metadata is returned', async () => {
    mockMetadataState({
      metadata: {
        id: 'host-1',
        name: 'host-1',
        features: [],
        info: {
          host: {
            os: {
              name: 'Ubuntu',
            },
          },
        },
      },
    });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataTable')).toBeInTheDocument();
  });

  it('should return loading text if loading', async () => {
    mockMetadataState({
      loading: true,
      metadata: undefined,
    });
    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataLoading')).toBeInTheDocument();
  });

  it('should label the pin, field and value columns', async () => {
    mockMetadataState({ metadata: hostMetadataWithFields });
    const result = await waitFor(() => renderHostMetadata());

    await waitFor(() => {
      expect(result.queryByTestId('infraAssetDetailsMetadataTable')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'Pin fields' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Field' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
  });

  it('should restore pinned fields from local storage and list them first', async () => {
    localStorage.setItem(LOCAL_STORAGE_PINNED_METADATA_ROWS, JSON.stringify(['host.hostname']));
    mockMetadataState({ metadata: hostMetadataWithFields });
    const result = await waitFor(() => renderHostMetadata());

    await waitFor(() => {
      expect(result.queryByTestId('infraAssetDetailsMetadataTable')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Pinned host.hostname')).toBeInTheDocument();

    // The header occupies the first row, so the first pinned field is the one right after it.
    const [, firstBodyRow] = screen.getAllByRole('row');
    expect(within(firstBodyRow).getByText('host.hostname')).toBeInTheDocument();
  });

  it('should pin and unpin metadata field', async () => {
    mockMetadataState({
      metadata: {
        id: 'host-1',
        name: 'host-1',
        features: [],
        info: {
          host: {
            os: {
              name: 'Ubuntu',
            },
            hostname: 'host-1',
          },
        },
      },
    });
    const result = await waitFor(() => renderHostMetadata());

    await waitFor(() => {
      expect(result.queryByTestId('infraAssetDetailsMetadataTable')).toBeInTheDocument();
    });

    const addPinButtons = result.getAllByTestId('infraAssetDetailsMetadataAddPin');
    expect(addPinButtons.length).toBeGreaterThan(0);

    addPinButtons[0].click();

    await waitFor(() => {
      const removePinButtons = result.getAllByTestId('infraAssetDetailsMetadataRemovePin');
      expect(removePinButtons.length).toBeGreaterThan(0);
    });

    expect(
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_PINNED_METADATA_ROWS) ?? '[]')
    ).toHaveLength(1);

    const removePinButton = result.getAllByTestId('infraAssetDetailsMetadataRemovePin')[0];
    removePinButton.click();

    await waitFor(() => {
      const addPinButtonsAfterUnpin = result.getAllByTestId('infraAssetDetailsMetadataAddPin');
      expect(addPinButtonsAfterUnpin.length).toBeGreaterThan(0);
    });

    expect(
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_PINNED_METADATA_ROWS) ?? '[]')
    ).toHaveLength(0);
  });

  it('should filter metadata rows when metadataSearch is set in url state', async () => {
    const metadata = {
      id: 'host-1',
      name: 'host-1',
      features: [],
      info: {
        host: {
          os: {
            name: 'Ubuntu',
          },
          hostname: 'host-1',
        },
        cloud: {
          provider: 'aws',
        },
      },
    };
    mockMetadataState({ metadata });

    const result = await waitFor(() => renderHostMetadata());

    await waitFor(() => {
      expect(result.queryByTestId('infraAssetDetailsMetadataTable')).toBeInTheDocument();
    });

    expect(
      result.queryByTestId('infraAssetDetailsMetadataField.cloud.provider')
    ).toBeInTheDocument();
    expect(result.queryByTestId('infraAssetDetailsMetadataField.host.os.name')).toBeInTheDocument();
    expect(
      result.queryByTestId('infraAssetDetailsMetadataField.host.hostname')
    ).toBeInTheDocument();

    mockUrlState({ metadataSearch: 'cloud' });
    result.rerender(
      <I18nProvider>
        <Metadata />
      </I18nProvider>
    );

    expect(
      result.queryByTestId('infraAssetDetailsMetadataField.cloud.provider')
    ).toBeInTheDocument();
    expect(
      result.queryByTestId('infraAssetDetailsMetadataField.host.os.name')
    ).not.toBeInTheDocument();
    expect(
      result.queryByTestId('infraAssetDetailsMetadataField.host.hostname')
    ).not.toBeInTheDocument();
  });

  it('should show the no data message when the search matches no field', async () => {
    mockMetadataState({ metadata: hostMetadataWithFields });
    mockUrlState({ metadataSearch: 'there-is-no-such-field' });

    const result = await waitFor(() => renderHostMetadata());

    expect(result.queryByTestId('infraAssetDetailsMetadataNoData')).toBeInTheDocument();
    expect(
      result.queryByTestId('infraAssetDetailsMetadataField.cloud.provider')
    ).not.toBeInTheDocument();
  });
});
