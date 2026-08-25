/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';

import { SchedulesTable } from '.';
import { useFindAttackDiscoverySchedules } from '../logic/use_find_schedules';
import { useEnableAttackDiscoverySchedule } from '../logic/use_enable_schedule';
import { useDisableAttackDiscoverySchedule } from '../logic/use_disable_schedule';
import { useDeleteAttackDiscoverySchedule } from '../logic/use_delete_schedule';
import { useScheduleApi } from '../logic/use_schedule_api';
import { mockFindAttackDiscoverySchedules } from '../../../mock/mock_find_attack_discovery_schedules';
import { useKibana } from '../../../../../common/lib/kibana';
import { ATTACK_DISCOVERY_FEATURE_ID } from '../../../../../../common/constants';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../logic/use_find_schedules');
jest.mock('../logic/use_enable_schedule');
jest.mock('../logic/use_disable_schedule');
jest.mock('../logic/use_delete_schedule');
jest.mock('../logic/use_schedule_api');

const mockUseFindAttackDiscoverySchedules = useFindAttackDiscoverySchedules as jest.MockedFunction<
  typeof useFindAttackDiscoverySchedules
>;
const mockUseScheduleApi = useScheduleApi as jest.MockedFunction<typeof useScheduleApi>;

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
const bulkDisableAttackDiscoverySchedulesMock = jest.fn();
const bulkDeleteAttackDiscoverySchedulesMock = jest.fn();

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
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
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

    mockUseScheduleApi.mockReturnValue({
      isWorkflowsEnabled: false,
      useBulkDeleteSchedules: jest
        .fn()
        .mockReturnValue({ mutateAsync: bulkDeleteAttackDiscoverySchedulesMock }),
      useBulkDisableSchedules: jest
        .fn()
        .mockReturnValue({ mutateAsync: bulkDisableAttackDiscoverySchedulesMock }),
      useBulkEnableSchedules: jest
        .fn()
        .mockReturnValue({ mutateAsync: bulkEnableAttackDiscoverySchedulesMock }),
      useCreateSchedule: jest.fn(),
      useDeleteSchedule: jest
        .fn()
        .mockReturnValue({ mutateAsync: deleteAttackDiscoveryScheduleMock }),
      useDisableSchedule: jest
        .fn()
        .mockReturnValue({ mutateAsync: disableAttackDiscoveryScheduleMock }),
      useEnableSchedule: jest
        .fn()
        .mockReturnValue({ mutateAsync: enableAttackDiscoveryScheduleMock }),
      useFindSchedules: mockUseFindAttackDiscoverySchedules,
      useGetSchedule: jest.fn(),
      useUpdateSchedule: jest.fn(),
    } as unknown as ReturnType<typeof useScheduleApi>);
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

  const confirmDeleteInModal = (getByTestId: ReturnType<typeof renderTable>['getByTestId']) => {
    const modal = getByTestId('schedulesTableBulkDeleteConfirmationModal');
    act(() => {
      fireEvent.click(within(modal).getByText('Delete'));
    });
  };

  it('should show single delete confirmation modal when trash icon is clicked', () => {
    const { getAllByTestId, getByTestId, getByText } = renderTable();

    act(() => {
      fireEvent.click(getAllByTestId('deleteButton')[0]);
    });

    expect(getByTestId('schedulesTableBulkDeleteConfirmationModal')).toBeInTheDocument();
    expect(getByText('Delete schedule?')).toBeInTheDocument();
    expect(
      getByText('This action will delete this scheduled attack discovery.')
    ).toBeInTheDocument();
  });

  it('should invoke delete schedule mutation after confirmation', async () => {
    const { getAllByTestId, getByTestId } = renderTable();

    const firstDeleteButton = getAllByTestId('deleteButton')[0];
    act(() => {
      fireEvent.click(firstDeleteButton);
    });
    confirmDeleteInModal(getByTestId);

    await waitFor(() => {
      expect(deleteAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        id: mockFindAttackDiscoverySchedules.schedules[0].id,
      });
    });
  });

  it('should not invoke delete schedule mutation when confirmation is cancelled', async () => {
    const { getAllByTestId, getByTestId } = renderTable();

    const firstDeleteButton = getAllByTestId('deleteButton')[0];
    act(() => {
      fireEvent.click(firstDeleteButton);
    });
    const modal = getByTestId('schedulesTableBulkDeleteConfirmationModal');
    act(() => {
      fireEvent.click(within(modal).getByText('Cancel'));
    });

    expect(deleteAttackDiscoveryScheduleMock).not.toHaveBeenCalled();
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
    const { container, getByTestId } = renderTable();

    selectSchedule(container, mockFindAttackDiscoverySchedules.schedules[0].id);
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
    });
    act(() => {
      fireEvent.click(getByTestId('schedulesTableBulkDeleteButton'));
    });
    confirmDeleteInModal(getByTestId);

    await waitFor(() => {
      expect(bulkDeleteAttackDiscoverySchedulesMock).toHaveBeenCalledWith({
        ids: [mockFindAttackDiscoverySchedules.schedules[0].id],
      });
    });
  });

  describe('when workflows feature flag is enabled', () => {
    const mockWorkflowDeleteMutateAsync = jest.fn();
    const mockWorkflowDisableMutateAsync = jest.fn();
    const mockWorkflowEnableMutateAsync = jest.fn();
    const mockWorkflowBulkDeleteMutateAsync = jest.fn();
    const mockWorkflowBulkDisableMutateAsync = jest.fn();
    const mockWorkflowBulkEnableMutateAsync = jest.fn();
    const mockUseFindWorkflowSchedules = jest.fn();

    beforeEach(() => {
      // Simulate the public API having no schedules (different storage from the internal API)
      mockUseFindAttackDiscoverySchedules.mockReturnValue({
        data: { schedules: [], total: 0 },
        isLoading: false,
        refetch: refetchSchedulesMock,
      } as unknown as jest.Mocked<ReturnType<typeof useFindAttackDiscoverySchedules>>);

      // The internal (workflow) find hook returns the schedules
      mockUseFindWorkflowSchedules.mockReturnValue({
        data: mockFindAttackDiscoverySchedules,
        isLoading: false,
        refetch: refetchSchedulesMock,
      });

      mockUseScheduleApi.mockReturnValue({
        isWorkflowsEnabled: true,
        useBulkDeleteSchedules: jest
          .fn()
          .mockReturnValue({ mutateAsync: mockWorkflowBulkDeleteMutateAsync }),
        useBulkDisableSchedules: jest
          .fn()
          .mockReturnValue({ mutateAsync: mockWorkflowBulkDisableMutateAsync }),
        useBulkEnableSchedules: jest
          .fn()
          .mockReturnValue({ mutateAsync: mockWorkflowBulkEnableMutateAsync }),
        useCreateSchedule: jest.fn(),
        useDeleteSchedule: jest
          .fn()
          .mockReturnValue({ mutateAsync: mockWorkflowDeleteMutateAsync }),
        useDisableSchedule: jest
          .fn()
          .mockReturnValue({ mutateAsync: mockWorkflowDisableMutateAsync }),
        useEnableSchedule: jest
          .fn()
          .mockReturnValue({ mutateAsync: mockWorkflowEnableMutateAsync }),
        useFindSchedules: mockUseFindWorkflowSchedules,
        useGetSchedule: jest.fn(),
        useUpdateSchedule: jest.fn(),
      } as unknown as ReturnType<typeof useScheduleApi>);
    });

    it('renders schedule rows sourced from the internal (workflow) API, not the public API', () => {
      const { getAllByRole } = renderTable();

      // 1 header row + schedule rows from the workflow find hook
      expect(getAllByRole('row').length).toBe(
        1 + mockFindAttackDiscoverySchedules.schedules.length
      );
    });

    it('invokes the workflow delete mutation when the delete button is clicked', async () => {
      const { getAllByTestId, getByTestId } = renderTable();

      act(() => {
        fireEvent.click(getAllByTestId('deleteButton')[0]);
      });
      confirmDeleteInModal(getByTestId);

      await waitFor(() => {
        expect(mockWorkflowDeleteMutateAsync).toHaveBeenCalledWith({
          id: mockFindAttackDiscoverySchedules.schedules[0].id,
        });
      });
    });

    it('invokes the workflow disable mutation when the enabled switch is clicked', async () => {
      const { getAllByTestId } = renderTable();

      act(() => {
        fireEvent.click(getAllByTestId('scheduleSwitch')[0]);
      });

      await waitFor(() => {
        expect(mockWorkflowDisableMutateAsync).toHaveBeenCalledWith({
          id: mockFindAttackDiscoverySchedules.schedules[0].id,
        });
      });
    });

    it('refetches the schedules after the workflow disable mutation so the table updates', async () => {
      const { getAllByTestId } = renderTable();

      act(() => {
        fireEvent.click(getAllByTestId('scheduleSwitch')[0]);
      });

      await waitFor(() => {
        expect(refetchSchedulesMock).toHaveBeenCalled();
      });
    });

    it('refetches the schedules after the workflow delete mutation so the table updates', async () => {
      const { getAllByTestId, getByTestId } = renderTable();

      act(() => {
        fireEvent.click(getAllByTestId('deleteButton')[0]);
      });
      confirmDeleteInModal(getByTestId);

      await waitFor(() => {
        expect(refetchSchedulesMock).toHaveBeenCalled();
      });
    });

    it('routes bulk enable through the workflow bulk hook, not the public API', async () => {
      const { container, getByTestId } = renderTable();

      const disabledSchedule = mockFindAttackDiscoverySchedules.schedules.find(
        ({ enabled }) => !enabled
      );
      selectSchedule(container, disabledSchedule?.id ?? '');
      act(() => {
        fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
      });
      act(() => {
        fireEvent.click(getByTestId('schedulesTableBulkEnableButton'));
      });

      await waitFor(() => {
        expect(mockWorkflowBulkEnableMutateAsync).toHaveBeenCalledWith({
          ids: [disabledSchedule?.id],
        });
      });
      expect(bulkEnableAttackDiscoverySchedulesMock).not.toHaveBeenCalled();
    });

    it('routes bulk disable through the workflow bulk hook, not the public API', async () => {
      const { container, getByTestId } = renderTable();

      const enabledSchedule = mockFindAttackDiscoverySchedules.schedules.find(
        ({ enabled }) => enabled
      );
      selectSchedule(container, enabledSchedule?.id ?? '');
      act(() => {
        fireEvent.click(getByTestId('schedulesTableBulkActions-popover'));
      });
      act(() => {
        fireEvent.click(getByTestId('schedulesTableBulkDisableButton'));
      });

      await waitFor(() => {
        expect(mockWorkflowBulkDisableMutateAsync).toHaveBeenCalledWith({
          ids: [enabledSchedule?.id],
        });
      });
      expect(bulkDisableAttackDiscoverySchedulesMock).not.toHaveBeenCalled();
    });

    it('routes bulk delete through the workflow bulk hook, not the public API', async () => {
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
        expect(mockWorkflowBulkDeleteMutateAsync).toHaveBeenCalledWith({
          ids: [mockFindAttackDiscoverySchedules.schedules[0].id],
        });
      });
      expect(bulkDeleteAttackDiscoverySchedulesMock).not.toHaveBeenCalled();
    });
  });
});
