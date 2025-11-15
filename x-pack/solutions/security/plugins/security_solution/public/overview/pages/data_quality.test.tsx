/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { getMockDataViewWithMatchedIndices } from '../../data_view_manager/mocks/mock_data_view';
import {
  defaultImplementation,
  withIndices,
} from '../../data_view_manager/hooks/__mocks__/use_data_view';

const mockedUseKibana = mockUseKibana();

jest.mock('../../common/components/empty_prompt');
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  const mockKibanaServices = {
    get: () => ({
      http: {
        fetch: jest.fn().mockImplementation((path: string, options: HttpFetchOptions) => {
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
    useKibana: jest.fn(),
    useUiSetting$: () => ['0,0.[000]'],
  };
});

const defaultUseSignalIndexReturn = {
  loading: false,
  signalIndexName: '.alerts-security.alerts-default',
};
const mockUseSignalIndex = jest.fn(() => defaultUseSignalIndexReturn);
jest.mock('../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => mockUseSignalIndex(),
}));

describe('DataQuality', () => {
  const defaultIlmPhases = 'hotwarmunmanaged';

  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          api: {
            getRelatedCases: jest.fn(),
          },
          hooks: {
            useCasesAddToNewCaseFlyout: jest.fn(),
          },
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
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

    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-*', 'logs-*', 'packetbeat-*']));
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

  describe('when indices exist, but dataview is still loading', () => {
    beforeEach(async () => {
      jest.mocked(useDataView).mockReturnValue({
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
      jest.mocked(useDataView).mockImplementation(defaultImplementation);

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
      jest.mocked(useDataView).mockReturnValue({
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
      (useKibana as jest.Mock).mockReturnValue({
        ...mockedUseKibana,
        services: {
          ...mockedUseKibana.services,
          cases: {
            api: {
              getRelatedCases: jest.fn(),
            },
            hooks: {
              useCasesAddToNewCaseFlyout: jest.fn(),
            },
            helpers: {
              canUseCases: jest.fn().mockReturnValue({
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
