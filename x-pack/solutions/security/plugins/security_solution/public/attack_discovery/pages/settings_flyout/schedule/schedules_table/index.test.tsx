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
import { useBulkEnableAttackDiscoverySchedules } from '../logic/use_bulk_enable_schedules';
import { useBulkDisableAttackDiscoverySchedules } from '../logic/use_bulk_disable_schedules';
import { useBulkDeleteAttackDiscoverySchedules } from '../logic/use_bulk_delete_schedules';
import { mockFindAttackDiscoverySchedules } from '../../../mock/mock_find_attack_discovery_schedules';
import { useKibana } from '../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../common/constants';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../logic/use_find_schedules');
jest.mock('../logic/use_enable_schedule');
jest.mock('../logic/use_disable_schedule');
jest.mock('../logic/use_delete_schedule');
jest.mock('../logic/use_bulk_enable_schedules');
jest.mock('../logic/use_bulk_disable_schedules');
jest.mock('../logic/use_bulk_delete_schedules');

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
const refetchSchedulesMock = jest.fn();
const bulkEnableAttackDiscoverySchedulesMock = jest.fn();
const mockUseBulkEnableAttackDiscoverySchedules =
  useBulkEnableAttackDiscoverySchedules as jest.MockedFunction<
    typeof useBulkEnableAttackDiscoverySchedules
  >;
const bulkDisableAttackDiscoverySchedulesMock = jest.fn();
const mockUseBulkDisableAttackDiscoverySchedules =
  useBulkDisableAttackDiscoverySchedules as jest.MockedFunction<
    typeof useBulkDisableAttackDiscoverySchedules
  >;
const bulkDeleteAttackDiscoverySchedulesMock = jest.fn();
const mockUseBulkDeleteAttackDiscoverySchedules =
  useBulkDeleteAttackDiscoverySchedules as jest.MockedFunction<
    typeof useBulkDeleteAttackDiscoverySchedules
  >;

describe('SchedulesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ATTACK_DISCOVERY_FEATURE_ID]: {
              updateAttackDiscoverySchedule: true,
            },
          },
        },
      },
    });

    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: mockFindAttackDiscoverySchedules,
      isLoading: false,
      refetch: refetchSchedulesMock,
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
    mockUseBulkEnableAttackDiscoverySchedules.mockReturnValue({
      mutateAsync: bulkEnableAttackDiscoverySchedulesMock,
    } as unknown as jest.Mocked<ReturnType<typeof useBulkEnableAttackDiscoverySchedules>>);
    mockUseBulkDisableAttackDiscoverySchedules.mockReturnValue({
      mutateAsync: bulkDisableAttackDiscoverySchedulesMock,
    } as unknown as jest.Mocked<ReturnType<typeof useBulkDisableAttackDiscoverySchedules>>);
    mockUseBulkDeleteAttackDiscoverySchedules.mockReturnValue({
      mutateAsync: bulkDeleteAttackDiscoverySchedulesMock,
    } as unknown as jest.Mocked<ReturnType<typeof useBulkDeleteAttackDiscoverySchedules>>);
  });

  const selectSchedule = (container: HTMLElement, scheduleId: string) => {
    const checkbox = container.querySelector(`[data-test-subj="checkboxSelectRow-${scheduleId}"]`);

    if (!checkbox) {
      throw new Error(`Unable to find selection checkbox for ${scheduleId}`);
    }

    act(() => {
      fireEvent.click(checkbox);
    });
  };

  const renderTable = () => render(<SchedulesTable />, { wrapper: TestProviders });

  it('should render the schedules table container', () => {
    const { getByTestId } = renderTable();

    expect(getByTestId('schedulesTableContainer')).toBeInTheDocument();
  });

  it('should render the schedules table description', () => {
    const { getByTestId } = renderTable();

    expect(getByTestId('schedulesTableDescription')).toBeInTheDocument();
  });

  it('should always render the schedules utility bar actions', () => {
    const { getByTestId } = renderTable();

    expect(getByTestId('schedulesTableBulkActionsSelectedCount')).toHaveTextContent(
      'Selected 0 schedules'
    );
    expect(getByTestId('schedulesTableBulkActions')).toHaveTextContent('Bulk actions');
    expect(getByTestId('schedulesTableRefreshButton')).toHaveTextContent('Refresh');
  });

  it('should disable bulk actions when no schedules are selected', () => {
    const { getByTestId, queryByTestId } = renderTable();

    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
    });

    expect(queryByTestId('schedulesTableBulkEnableButton')).not.toBeInTheDocument();
  });

  it('should refetch schedules when refresh is clicked', () => {
    const { getByTestId } = renderTable();

    act(() => {
      fireEvent.click(getByTestId('schedulesTableRefreshButton-linkIcon'));
    });

    expect(refetchSchedulesMock).toHaveBeenCalled();
  });

  it('should render the correct number of rows in the schedules table', () => {
    const { getAllByRole } = renderTable();

    expect(getAllByRole('row').length).toBe(1 + mockFindAttackDiscoverySchedules.schedules.length); // 1 header row + schedule rows
  });

  it('should invoke delete schedule mutation', async () => {
    const { getAllByTestId } = renderTable();

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
    const { getAllByTestId } = renderTable();

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
      refetch: refetchSchedulesMock,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { getAllByTestId } = renderTable();

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

  it('should render bulk actions when schedules are selected', () => {
    const { container, getByTestId } = renderTable();

    selectSchedule(container, mockFindAttackDiscoverySchedules.schedules[0].id);

    expect(getByTestId('schedulesTableBulkActionsSelectedCount')).toHaveTextContent(
      'Selected 1 schedule'
    );
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
    });

    expect(getByTestId('schedulesTableBulkDisableButton')).toBeInTheDocument();
  });

  it('should invoke bulk enable schedules mutation', async () => {
    const schedules = [
      mockFindAttackDiscoverySchedules.schedules[0],
      { ...mockFindAttackDiscoverySchedules.schedules[1], enabled: false },
    ];
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      data: { total: schedules.length, schedules },
      isLoading: false,
      refetch: refetchSchedulesMock,
    } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

    const { container, getByTestId } = renderTable();

    selectSchedule(container, schedules[1].id);
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
    });
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkEnableButton'));
    });

    await waitFor(() => {
      expect(bulkEnableAttackDiscoverySchedulesMock).toHaveBeenCalledWith({
        ids: [schedules[1].id],
      });
    });
  });

  it('should invoke bulk disable schedules mutation', async () => {
    const { container, getByTestId } = renderTable();

    selectSchedule(container, mockFindAttackDiscoverySchedules.schedules[0].id);
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
    });
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkDisableButton'));
    });

    await waitFor(() => {
      expect(bulkDisableAttackDiscoverySchedulesMock).toHaveBeenCalledWith({
        ids: [mockFindAttackDiscoverySchedules.schedules[0].id],
      });
    });
  });

  it('should invoke bulk delete schedules mutation after confirmation', async () => {
    const { container, getByTestId, getAllByText } = renderTable();

    selectSchedule(container, mockFindAttackDiscoverySchedules.schedules[0].id);
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
    });
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkDeleteButton'));
    });
    act(() => {
      fireEvent.click(getAllByText('Delete')[1]);
    });

    await waitFor(() => {
      expect(bulkDeleteAttackDiscoverySchedulesMock).toHaveBeenCalledWith({
        ids: [mockFindAttackDiscoverySchedules.schedules[0].id],
      });
    });
  });
});
