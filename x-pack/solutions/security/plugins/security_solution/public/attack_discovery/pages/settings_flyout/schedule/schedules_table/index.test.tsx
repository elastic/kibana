/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { SchedulesTable } from '.';
import { useFindAttackDiscoverySchedules } from '../logic/use_find_schedules';
import { useEnableAttackDiscoverySchedule } from '../logic/use_enable_schedule';
import { useDisableAttackDiscoverySchedule } from '../logic/use_disable_schedule';
import { useDeleteAttackDiscoverySchedule } from '../logic/use_delete_schedule';
import { mockFindAttackDiscoverySchedules } from '../../../mock/mock_find_attack_discovery_schedules';

jest.mock('../logic/use_find_schedules');
jest.mock('../logic/use_enable_schedule');
jest.mock('../logic/use_disable_schedule');
jest.mock('../logic/use_delete_schedule');

const mockUseFindAttackDiscoverySchedules = useFindAttackDiscoverySchedules as jest.MockedFunction<
  typeof useFindAttackDiscoverySchedules
>;

const enableAttackDiscoveryScheduleMock = jest.fn();
const mockUseEnableAttackDiscoverySchedule =
  useEnableAttackDiscoverySchedule as jest.MockedFunction<typeof useEnableAttackDiscoverySchedule>;
const disableAttackDiscoveryScheduleMock = jest.fn();
const mockUseDisableAttackDiscoverySchedule =
  useDisableAttackDiscoverySchedule as jest.MockedFunction<
    typeof useDisableAttackDiscoverySchedule
  >;
const deleteAttackDiscoveryScheduleMock = jest.fn();
const mockUseDeleteAttackDiscoverySchedule =
  useDeleteAttackDiscoverySchedule as jest.MockedFunction<typeof useDeleteAttackDiscoverySchedule>;

describe('SchedulesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: mockFindAttackDiscoverySchedules,
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    mockUseEnableAttackDiscoverySchedule.mockReturnValue({
      mutateAsync: enableAttackDiscoveryScheduleMock,
    } as unknown as jest.Mocked<ReturnType<typeof useEnableAttackDiscoverySchedule>>);
    mockUseDisableAttackDiscoverySchedule.mockReturnValue({
      mutateAsync: disableAttackDiscoveryScheduleMock,
    } as unknown as jest.Mocked<ReturnType<typeof useDisableAttackDiscoverySchedule>>);
    mockUseDeleteAttackDiscoverySchedule.mockReturnValue({
      mutateAsync: deleteAttackDiscoveryScheduleMock,
    } as unknown as jest.Mocked<ReturnType<typeof useDeleteAttackDiscoverySchedule>>);
  });

  it('should render the schedules table container', () => {
    const { getByTestId } = render(<SchedulesTable />);

    expect(getByTestId('schedulesTableContainer')).toBeInTheDocument();
  });

  it('should render the schedules table description', () => {
    const { getByTestId } = render(<SchedulesTable />);

    expect(getByTestId('schedulesTableDescription')).toBeInTheDocument();
  });

  it('should render the correct number of rows in the schedules table', () => {
    const { getAllByRole } = render(<SchedulesTable />);

    expect(getAllByRole('row').length).toBe(1 + mockFindAttackDiscoverySchedules.schedules.length); // 1 header row + schedule rows
  });

  it('should invoke delete schedule mutation', async () => {
    const { getAllByTestId } = render(<SchedulesTable />);

    const firstDeleteButton = getAllByTestId('deleteButton')[0];
    act(() => {
      fireEvent.click(firstDeleteButton);
    });

    await waitFor(() => {
      expect(deleteAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        id: mockFindAttackDiscoverySchedules.schedules[0].id,
      });
    });
  });

  it('should invoke disable schedule mutation', async () => {
    const { getAllByTestId } = render(<SchedulesTable />);

    const firstSwitchButton = getAllByTestId('scheduleSwitch')[0];
    act(() => {
      fireEvent.click(firstSwitchButton);
    });

    await waitFor(() => {
      expect(disableAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        id: mockFindAttackDiscoverySchedules.schedules[0].id,
      });
    });
  });

  it('should invoke enable schedule mutation', async () => {
    const schedules = [
      mockFindAttackDiscoverySchedules.schedules[0],
      { ...mockFindAttackDiscoverySchedules.schedules[1], enabled: false },
    ];
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: { total: schedules.length, schedules },
      isLoading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { getAllByTestId } = render(<SchedulesTable />);

    const secondSwitchButton = getAllByTestId('scheduleSwitch')[1];
    act(() => {
      fireEvent.click(secondSwitchButton);
    });

    await waitFor(() => {
      expect(enableAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        id: schedules[1].id,
      });
    });
  });
});
