/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { HttpFetchOptions } from '@kbn/core-http-browser';

import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { TestProviders } from '../../common/mock';
import { DataQuality } from './data_quality';
import { useKibana } from '../../common/lib/kibana';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import {
  getMockDataView,
  getMockDataViewWithMatchedIndices,
} from '../../data_view_manager/mocks/mock_data_view';
import {
  defaultImplementation,
  withIndices,
} from '../../data_view_manager/hooks/__mocks__/use_data_view';
import { DataQualityPanel } from '@kbn/ecs-data-quality-dashboard';

const mockedUseKibana = mockUseKibana();

vi.mock('@kbn/ecs-data-quality-dashboard', async () => {
  const actual = await vi.importActual('@kbn/ecs-data-quality-dashboard');
  const ReactActual = require('react');

  return {
    ...actual,
    DataQualityPanel: vi.fn((props: React.ComponentProps<typeof actual.DataQualityPanel>) =>
      ReactActual.createElement(actual.DataQualityPanel, props)
    ),
  };
});

vi.mock('../../common/components/empty_prompt');
vi.mock('../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../common/lib/kibana');

  const mockKibanaServices = {
    get: () => ({
      http: {
        fetch: vi.fn().mockImplementation((path: string, options: HttpFetchOptions) => {
          if (
            path.startsWith('/internal/ecs_data_quality_dashboard/results_latest') &&
            options.method === 'GET'
          ) {
            return Promise.resolve([]);
          }
          return Promise.resolve();
        }),
      },
    }),
  };

  return {
    ...original,
    KibanaServices: mockKibanaServices,
    useKibana: vi.fn(),
    useUiSetting$: () => ['0,0.[000]'],
  };
});

const defaultUseSignalIndexReturn = {
  loading: false,
  signalIndexName: '.alerts-security.alerts-default',
};
const mockUseSignalIndex = vi.fn(() => defaultUseSignalIndexReturn);
vi.mock('../../detections/containers/detection_engine/alerts/use_signal_index', () => {
  const mocked = {
    useSignalIndex: () => mockUseSignalIndex(),
  };
  return { ...mocked, default: mocked };
});

describe('DataQuality', () => {
  const defaultIlmPhases = 'hotwarmunmanaged';

  beforeEach(() => {
    vi.clearAllMocks();

    (useKibana as Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          api: {
            getRelatedCases: vi.fn(),
          },
          hooks: {
            useCasesAddToNewCaseFlyout: vi.fn(),
          },
          helpers: {
            canUseCases: vi.fn().mockReturnValue({
              all: false,
              create: false,
              read: true,
              update: false,
              delete: false,
              push: false,
            }),
          },
        },
        configSettings: { ILMEnabled: true },
      },
    });

    mockUseSignalIndex.mockReturnValue(defaultUseSignalIndexReturn);

    vi.mocked(useDataView).mockReturnValue(withIndices(['auditbeat-*', 'logs-*', 'packetbeat-*']));
  });

  describe('when indices exist, and loading is complete', () => {
    beforeEach(async () => {
      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it renders the expected default ILM phases', () => {
      expect(screen.getByTestId('selectIlmPhases')).toHaveTextContent(defaultIlmPhases);
    });

    test('it does NOT render the loading spinner', () => {
      expect(screen.queryByTestId('ecsDataQualityDashboardLoader')).not.toBeInTheDocument();
    });

    test('it renders data quality panel content', () => {
      expect(screen.getByTestId('dataQualitySummary')).toBeInTheDocument();
    });

    test('it does NOT render the landing page', () => {
      expect(screen.queryByTestId('empty-prompt')).not.toBeInTheDocument();
    });
  });

  describe('when useDataView matched indices include the same pattern as the signal index', () => {
    const alertsIndex = '.alerts-security.alerts-default';

    beforeEach(async () => {
      vi.mocked(useDataView).mockReturnValue(withIndices(['logs-*', alertsIndex, 'auditbeat-*']));

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dataQualitySummary')).toBeInTheDocument();
      });
    });

    test('passes each pattern once to DataQualityPanel', () => {
      const MockDataQualityPanel = vi.mocked(DataQualityPanel);
      expect(MockDataQualityPanel.mock.calls[0][0].patterns).toEqual([
        alertsIndex,
        'logs-*',
        'auditbeat-*',
      ]);
    });
  });

  describe('when indices exist, but dataView is still loading', () => {
    beforeEach(async () => {
      vi.mocked(useDataView).mockReturnValue({
        dataView: getMockDataViewWithMatchedIndices(['auditbeat-*', 'logs-*', 'packetbeat-*']),
        status: 'loading',
      });

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it does NOT render the ILM phases selection', () => {
      expect(screen.queryByTestId('selectIlmPhases')).not.toBeInTheDocument();
    });

    test('it renders the loading spinner', () => {
      expect(screen.getByTestId('ecsDataQualityDashboardLoader')).toBeInTheDocument();
    });

    test('it does NOT render the data quality panel content', () => {
      expect(screen.queryByTestId('dataQualitySummary')).not.toBeInTheDocument();
    });

    test('it does NOT render the landing page', () => {
      expect(screen.queryByTestId('empty-prompt')).not.toBeInTheDocument();
    });
  });

  describe('when indices exist, but the signal index name is still loading', () => {
    beforeEach(async () => {
      mockUseSignalIndex.mockReturnValue({ ...defaultUseSignalIndexReturn, loading: true });

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it does NOT render the ILM phases selection', () => {
      expect(screen.queryByTestId('selectIlmPhases')).not.toBeInTheDocument();
    });

    test('it renders the loading spinner', () => {
      expect(screen.getByTestId('ecsDataQualityDashboardLoader')).toBeInTheDocument();
    });

    test('it does NOT render the data quality panel content', () => {
      expect(screen.queryByTestId('dataQualitySummary')).not.toBeInTheDocument();
    });

    test('it does NOT render the landing page', () => {
      expect(screen.queryByTestId('empty-prompt')).not.toBeInTheDocument();
    });
  });

  describe('when indices do NOT exist, and loading is complete', () => {
    beforeEach(async () => {
      mockUseSignalIndex.mockReturnValue({ ...defaultUseSignalIndexReturn, loading: false });
      vi.mocked(useDataView).mockImplementation(defaultImplementation);

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it does NOT render the ILM phases selection', () => {
      expect(screen.queryByTestId('selectIlmPhases')).not.toBeInTheDocument();
    });

    test('it does NOT render the loading spinner', () => {
      expect(screen.queryByTestId('ecsDataQualityDashboardLoader')).not.toBeInTheDocument();
    });

    test('it does NOT render the data quality panel content', () => {
      expect(screen.queryByTestId('dataQualitySummary')).not.toBeInTheDocument();
    });

    test('it renders the landing page', () => {
      expect(screen.getByTestId('empty-prompt')).toBeInTheDocument();
    });
  });

  describe('when indices do NOT exist, but dataview is still loading', () => {
    beforeEach(async () => {
      mockUseSignalIndex.mockReturnValue({ ...defaultUseSignalIndexReturn, loading: false });
      vi.mocked(useDataView).mockReturnValue({
        dataView: getMockDataView(),
        status: 'loading',
      });

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it does NOT render the ILM phases selection', () => {
      expect(screen.queryByTestId('selectIlmPhases')).not.toBeInTheDocument();
    });

    test('it renders the loading spinner', () => {
      expect(screen.getByTestId('ecsDataQualityDashboardLoader')).toBeInTheDocument();
    });

    test('it does NOT render the data quality panel content', () => {
      expect(screen.queryByTestId('dataQualitySummary')).not.toBeInTheDocument();
    });

    test('it does NOT render the landing page', () => {
      expect(screen.queryByTestId('empty-prompt')).not.toBeInTheDocument();
    });
  });

  describe('when indices do NOT exist, but the signal index name is still loading', () => {
    beforeEach(async () => {
      mockUseSignalIndex.mockReturnValue({ ...defaultUseSignalIndexReturn, loading: true });

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it does NOT render the ILM phases selection', () => {
      expect(screen.queryByTestId('selectIlmPhases')).not.toBeInTheDocument();
    });

    test('it renders the loading spinner', () => {
      expect(screen.getByTestId('ecsDataQualityDashboardLoader')).toBeInTheDocument();
    });

    test('it does NOT render the data quality panel content', () => {
      expect(screen.queryByTestId('dataQualitySummary')).not.toBeInTheDocument();
    });

    test('it does NOT render the landing page', () => {
      expect(screen.queryByTestId('empty-prompt')).not.toBeInTheDocument();
    });
  });

  describe('when ILMEnabled is false', () => {
    beforeEach(async () => {
      (useKibana as Mock).mockReturnValue({
        ...mockedUseKibana,
        services: {
          ...mockedUseKibana.services,
          cases: {
            api: {
              getRelatedCases: vi.fn(),
            },
            hooks: {
              useCasesAddToNewCaseFlyout: vi.fn(),
            },
            helpers: {
              canUseCases: vi.fn().mockReturnValue({
                all: false,
                create: false,
                read: true,
                update: false,
                delete: false,
                push: false,
              }),
            },
          },
          configSettings: { ILMEnabled: false },
        },
      });

      render(
        <KibanaRenderContextProvider {...mockedUseKibana.services}>
          <TestProviders>
            <MemoryRouter>
              <DataQuality />
            </MemoryRouter>
          </TestProviders>
        </KibanaRenderContextProvider>
      );

      await waitFor(() => {});
    });

    test('it should not render default ILM phases', () => {
      expect(screen.queryByTestId('selectIlmPhases')).not.toBeInTheDocument();
    });

    test('it should render a date picker', () => {
      expect(screen.getByTestId('dataQualityDatePicker')).toBeInTheDocument();
    });
  });
});
