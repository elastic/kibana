/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import { useScheduleView } from './use_schedule_view';
import { useFindAttackDiscoverySchedules } from '../schedule/logic/use_find_schedules';
import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { TestProviders } from '../../../../common/mock';
import { mockFindAttackDiscoverySchedules } from '../../mock/mock_find_attack_discovery_schedules';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../sourcerer/containers');
jest.mock('../schedule/logic/use_find_schedules');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;
const mockUseFindAttackDiscoverySchedules = useFindAttackDiscoverySchedules as jest.MockedFunction<
  typeof useFindAttackDiscoverySchedules
>;
const getBooleanValueMock = jest.fn();

describe('useScheduleView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getBooleanValueMock.mockReturnValue(false);

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: getBooleanValueMock,
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: {
          ...triggersActionsUiMock.createStart(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);

    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: mockFindAttackDiscoverySchedules,
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);
  });

  it('should return the `empty schedules` page if there are no existing schedules', () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: { schedules: [], total: 0 },
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { result } = renderHook(() => useScheduleView());

    render(<TestProviders>{result.current.scheduleView}</TestProviders>);

    expect(screen.getByTestId('emptySchedule')).toBeInTheDocument();
  });

  it('should not return `create new schedule` action button if there are no existing schedules', () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: { schedules: [], total: 0 },
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { result } = renderHook(() => useScheduleView());

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.queryByTestId('createNewSchedule')).not.toBeInTheDocument();
  });

  it('should return the `attack discovery schedules table` if there are existing schedules', () => {
    const { result } = renderHook(() => useScheduleView());

    render(<TestProviders>{result.current.scheduleView}</TestProviders>);

    expect(screen.getByTestId('schedulesTable')).toBeInTheDocument();
  });

  it('should return `create new schedule` action button if there are existing schedules', () => {
    const { result } = renderHook(() => useScheduleView());

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('createNewSchedule')).toBeInTheDocument();
  });

  it('should show create schedule flyout on `create new schedule` action button click', async () => {
    const { result } = renderHook(() => useScheduleView());

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('createNewSchedule')).toBeInTheDocument();

    const createNewSchedule = screen.getByTestId('createNewSchedule');
    act(() => {
      fireEvent.click(createNewSchedule);
    });

    render(<TestProviders>{result.current.scheduleView}</TestProviders>);
    await waitFor(() => {
      expect(screen.getByTestId('scheduleCreateFlyout')).toBeInTheDocument();
    });
  });
});
