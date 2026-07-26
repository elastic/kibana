/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
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

  it('removes maintenance windows only from monitors that currently have one', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { maintenanceWindows: ['mw-1'] }),
      makeMonitor('ui-2', 'UI monitor 2 already empty', { maintenanceWindows: [] }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId, getByRole } = render(
      <BulkMaintenanceWindowsFlyout monitors={monitors} onClose={onClose} reloadPage={reloadPage} />
    );

    fireEvent.click(getByRole('button', { name: 'Remove' }));
    clickSave(getByTestId);

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: 'default',
        updates: [{ id: 'ui-1', attributes: { [ConfigKey.MAINTENANCE_WINDOWS]: [] } }],
      });
    });
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
});
