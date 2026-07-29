/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { render } from '../../../../utils/testing/rtl_helpers';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { useGetUrlParams } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { BulkMaintenanceWindowsFlyout } from './bulk_maintenance_windows_flyout';

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useGetUrlParams: jest.fn(),
}));

jest.mock('../../../../state', () => ({
  ...jest.requireActual('../../../../state'),
  fetchBulkUpdateMonitors: jest.fn(),
}));

// The real field renders an EuiComboBox backed by redux data; a lightweight
// stand-in keeps these tests focused on the flyout's own apply/remove logic.
jest.mock('../../../monitor_add_edit/fields/maintenance_windows/maintenance_windows', () => ({
  MaintenanceWindowsField: ({
    value,
    onChange,
  }: {
    value?: string[];
    onChange: (val: string[]) => void;
  }) => (
    <button data-test-subj="mockMaintenanceWindowsField" onClick={() => onChange(['mw-2'])}>
      {`selected:${value?.join(',') ?? ''}`}
    </button>
  ),
}));

jest.mock(
  '../../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn',
  () => ({
    MaintenanceWindowsLink: () => null,
  })
);

// Remove mode reads the full window list to resolve id -> title for the
// applied-windows selector.
jest.mock('../../../monitor_add_edit/fields/maintenance_windows/use_maintenance_windows', () => ({
  useMaintenanceWindows: () => ({
    isLoading: false,
    data: {
      data: [
        { id: 'mw-1', title: 'MW One' },
        { id: 'mw-2', title: 'MW Two' },
      ],
    },
  }),
}));

const useGetUrlParamsMock = useGetUrlParams as jest.MockedFunction<typeof useGetUrlParams>;
const fetchBulkUpdateMonitorsMock = fetchBulkUpdateMonitors as jest.MockedFunction<
  typeof fetchBulkUpdateMonitors
>;

const makeMonitor = (
  id: string,
  name: string,
  {
    origin = SourceType.UI,
    maintenanceWindows = [],
  }: { origin?: SourceType; maintenanceWindows?: string[] } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: name,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.MAINTENANCE_WINDOWS]: maintenanceWindows,
  } as unknown as EncryptedSyntheticsSavedMonitor);

describe('<BulkMaintenanceWindowsFlyout />', () => {
  const onClose = jest.fn();
  const reloadPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGetUrlParamsMock.mockReturnValue({ spaceId: 'default' } as ReturnType<
      typeof useGetUrlParams
    >);
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [] });
  });

  const selectWindow = (getByTestId: (id: string) => HTMLElement) => {
    fireEvent.click(getByTestId('mockMaintenanceWindowsField'));
  };

  const clickSave = (getByTestId: (id: string) => HTMLElement) => {
    fireEvent.click(getByTestId('syntheticsBulkMaintenanceWindowsSave'));
  };

  const switchToRemove = (getByRole: (role: string, opts: { name: string }) => HTMLElement) => {
    fireEvent.click(getByRole('button', { name: 'Remove' }));
  };

  // Open the Remove-mode combo box and pick a window by its title.
  const selectRemoveWindow = (getByTestId: (id: string) => HTMLElement, label: string) => {
    const combo = getByTestId('syntheticsBulkMaintenanceWindowsRemoveComboBox');
    fireEvent.click(within(combo).getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: label }));
  };

  it('splits eligible vs. skipped monitors', () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1'),
      makeMonitor('project-1', 'Project monitor', { origin: SourceType.PROJECT }),
    ];

    const { getByText } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    expect(
      getByText('Apply or remove maintenance windows for 1 selected monitor.')
    ).toBeInTheDocument();
    expect(getByText('1 monitor will not be updated')).toBeInTheDocument();
    expect(getByText('Project monitor')).toBeInTheDocument();
  });

  it('disables save until a maintenance window is selected in apply mode', () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1')];

    const { getByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    expect(getByTestId('syntheticsBulkMaintenanceWindowsSave')).toBeDisabled();

    selectWindow(getByTestId);

    expect(getByTestId('syntheticsBulkMaintenanceWindowsSave')).toBeEnabled();
  });

  it('applies the selected window only to monitors whose set actually changes', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { maintenanceWindows: [] }),
      makeMonitor('ui-2', 'UI monitor 2 already has it', { maintenanceWindows: ['mw-2'] }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectWindow(getByTestId);
    clickSave(getByTestId);

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: 'default',
        updates: [{ id: 'ui-1', attributes: { [ConfigKey.MAINTENANCE_WINDOWS]: ['mw-2'] } }],
      });
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('removes only the chosen window, and only from monitors that have it', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { maintenanceWindows: ['mw-1', 'mw-2'] }),
      makeMonitor('ui-2', 'UI monitor 2 without mw-1', { maintenanceWindows: ['mw-2'] }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId, getByRole } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    switchToRemove(getByRole);
    selectRemoveWindow(getByTestId, 'MW One'); // mw-1
    clickSave(getByTestId);

    await waitFor(() => {
      // Only ui-1 has mw-1; it drops to [mw-2]. ui-2 is untouched.
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: 'default',
        updates: [{ id: 'ui-1', attributes: { [ConfigKey.MAINTENANCE_WINDOWS]: ['mw-2'] } }],
      });
    });
  });

  it('shows a clear message and disables save when nothing is attached to remove', () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { maintenanceWindows: [] }),
      makeMonitor('ui-2', 'UI monitor 2', { maintenanceWindows: [] }),
    ];

    const { getByTestId, getByRole, queryByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    switchToRemove(getByRole);

    expect(getByTestId('syntheticsBulkMaintenanceWindowsNothingToRemove')).toHaveTextContent(
      'None of the selected monitors have maintenance windows to remove.'
    );
    expect(queryByTestId('syntheticsBulkMaintenanceWindowsRemoveComboBox')).not.toBeInTheDocument();
    expect(getByTestId('syntheticsBulkMaintenanceWindowsSave')).toBeDisabled();
  });

  it('shows a success toast when all changed monitors are updated', async () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1')];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectWindow(getByTestId);
    clickSave(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Maintenance windows applied to 1 monitor.' })
      );
    });
    expect(kibanaService.toasts.addWarning).not.toHaveBeenCalled();
    expect(kibanaService.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('shows a partial-failure warning toast when some updates fail', async () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1'), makeMonitor('ui-2', 'UI monitor 2')];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [
        { id: 'ui-1', updated: true },
        { id: 'ui-2', updated: false, error: 'boom' },
      ],
    });

    const { getByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectWindow(getByTestId);
    clickSave(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '1 updated, 1 failed. Check that the failed monitors are editable and try again.',
        })
      );
    });
    expect(kibanaService.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('shows a danger toast when the request throws', async () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1')];
    fetchBulkUpdateMonitorsMock.mockRejectedValue(new Error('network error'));

    const { getByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    selectWindow(getByTestId);
    clickSave(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to apply maintenance windows. Please try again later.',
        })
      );
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancelled without hitting the API', () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1')];

    const { getByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    fireEvent.click(getByTestId('syntheticsBulkMaintenanceWindowsCancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchBulkUpdateMonitorsMock).not.toHaveBeenCalled();
  });

  it('summarises how many monitors will change vs. stay unchanged', () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { maintenanceWindows: [] }),
      makeMonitor('ui-2', 'UI monitor 2 already has it', { maintenanceWindows: ['mw-2'] }),
    ];

    const { getByTestId, queryByTestId } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    // Apply mode with nothing picked yet: no summary.
    expect(queryByTestId('syntheticsBulkMaintenanceWindowsEffectSummary')).not.toBeInTheDocument();

    // Pick mw-2: ui-1 gains it (changes), ui-2 already has it (unchanged).
    selectWindow(getByTestId);
    expect(getByTestId('syntheticsBulkMaintenanceWindowsEffectSummary')).toHaveTextContent(
      '1 will change · 1 unchanged'
    );
  });

  it('summarises the outcome in remove mode once a window is chosen', () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { maintenanceWindows: ['mw-1'] }),
      makeMonitor('ui-2', 'UI monitor 2 without mw-1', { maintenanceWindows: ['mw-2'] }),
    ];

    const { getByTestId, getByRole } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    switchToRemove(getByRole);
    selectRemoveWindow(getByTestId, 'MW One'); // mw-1

    // Only ui-1 has mw-1 (changes); ui-2 keeps mw-2 (unchanged).
    expect(getByTestId('syntheticsBulkMaintenanceWindowsEffectSummary')).toHaveTextContent(
      '1 will change · 1 unchanged'
    );
  });
});
