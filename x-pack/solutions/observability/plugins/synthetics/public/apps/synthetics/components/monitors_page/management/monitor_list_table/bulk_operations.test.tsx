/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { fireEvent } from '@testing-library/react';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';
import { render } from '../../../../utils/testing/rtl_helpers';
import {
  useCanEditSynthetics,
  useCanUsePublicLocationsPermission,
} from '../../../../../../hooks/use_capabilities';
import { useEnablement } from '../../../../hooks';
import { useMonitorIntegrationHealth } from '../../../common/hooks/use_monitor_integration_health';
import { BulkOperations } from './bulk_operations';

vi.mock('../../../../../../hooks/use_capabilities', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../../../hooks/use_capabilities')),
    useCanEditSynthetics: vi.fn(),
    useCanUsePublicLocationsPermission: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../hooks')),
    useEnablement: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_monitor_integration_health', () => {
  const mocked = {
    useMonitorIntegrationHealth: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const useCanEditSyntheticsMock = useCanEditSynthetics as MockedFunction<
  typeof useCanEditSynthetics
>;
const useCanUsePublicLocationsPermissionMock = useCanUsePublicLocationsPermission as MockedFunction<
  typeof useCanUsePublicLocationsPermission
>;
const useEnablementMock = useEnablement as MockedFunction<typeof useEnablement>;
const useMonitorIntegrationHealthMock = useMonitorIntegrationHealth as MockedFunction<
  typeof useMonitorIntegrationHealth
>;

const makeMonitor = (
  id: string,
  {
    origin = SourceType.UI,
    enabled = true,
    serviceManaged = false,
  }: { origin?: SourceType; enabled?: boolean; serviceManaged?: boolean } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: id,
    [ConfigKey.ENABLED]: enabled,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    [ConfigKey.LOCATIONS]: [{ id: 'loc', isServiceManaged: serviceManaged }],
  } as unknown as EncryptedSyntheticsSavedMonitor);

describe('<BulkOperations />', () => {
  const setMonitorPendingStatusUpdate = vi.fn();

  const renderMenu = (selectedItems: EncryptedSyntheticsSavedMonitor[]) => {
    const utils = render(
      <BulkOperations
        selectedItems={selectedItems}
        setMonitorPendingDeletion={vi.fn()}
        setMonitorPendingReset={vi.fn()}
        setMonitorPendingStatusUpdate={setMonitorPendingStatusUpdate}
        setBulkEditAction={vi.fn()}
        setIsLocationsFlyoutOpen={vi.fn()}
        setIsScheduleFlyoutOpen={vi.fn()}
        setIsMaintenanceWindowsFlyoutOpen={vi.fn()}
      />
    );
    fireEvent.click(utils.getByTestId('syntheticsBulkActionsButton'));
    return utils;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCanEditSyntheticsMock.mockReturnValue(true);
    useCanUsePublicLocationsPermissionMock.mockReturnValue(true);
    useEnablementMock.mockReturnValue({ isServiceAllowed: true } as ReturnType<
      typeof useEnablement
    >);
    useMonitorIntegrationHealthMock.mockReturnValue({
      isUnhealthy: () => false,
      isFixableByReset: () => false,
    } as unknown as ReturnType<typeof useMonitorIntegrationHealth>);
  });

  it('counts project/terraform monitors as eligible for enable/disable', () => {
    const { getByTestId } = renderMenu([
      makeMonitor('ui-1', { enabled: false }),
      makeMonitor('project-1', { origin: SourceType.PROJECT, enabled: false }),
    ]);

    const enableItem = getByTestId('syntheticsBulkEnableMonitorsItem');
    expect(enableItem).toHaveTextContent('Enable 2 monitors');
    expect(enableItem).not.toBeDisabled();
  });

  it('still passes the full by-state selection to the modal so skipped monitors are surfaced', () => {
    const { getByTestId } = renderMenu([
      makeMonitor('ui-1', { enabled: false }),
      makeMonitor('project-1', { origin: SourceType.PROJECT, enabled: false }),
    ]);

    fireEvent.click(getByTestId('syntheticsBulkEnableMonitorsItem'));

    expect(setMonitorPendingStatusUpdate).toHaveBeenCalledWith({
      ids: ['ui-1', 'project-1'],
      enabled: true,
    });
  });

  it('disables the enable action when every disabled monitor is ineligible', () => {
    // Project monitors are eligible for enable/disable, so the only way to be
    // ineligible is a public-location monitor without the required permission.
    useCanUsePublicLocationsPermissionMock.mockReturnValue(false);

    const { getByTestId } = renderMenu([
      makeMonitor('public-1', { enabled: false, serviceManaged: true }),
    ]);

    expect(getByTestId('syntheticsBulkEnableMonitorsItem')).toBeDisabled();
  });

  it('excludes public-location monitors when the user lacks the permission', () => {
    useCanUsePublicLocationsPermissionMock.mockReturnValue(false);

    const { getByTestId } = renderMenu([
      makeMonitor('ui-public', { enabled: false, serviceManaged: true }),
    ]);

    expect(getByTestId('syntheticsBulkEnableMonitorsItem')).toBeDisabled();
  });

  it('counts eligible monitors for the disable action', () => {
    const { getByTestId } = renderMenu([makeMonitor('ui-1', { enabled: true })]);

    const disableItem = getByTestId('syntheticsBulkDisableMonitorsItem');
    expect(disableItem).toHaveTextContent('Disable 1 monitor');
    expect(disableItem).not.toBeDisabled();
  });

  it('disables config edits when every selected monitor is project/terraform origin', () => {
    const { getByTestId } = renderMenu([
      makeMonitor('project-1', { origin: SourceType.PROJECT, enabled: true }),
      makeMonitor('project-2', { origin: SourceType.PROJECT, enabled: false }),
    ]);

    expect(getByTestId('syntheticsBulkEnableMonitorsItem')).not.toBeDisabled();
    expect(getByTestId('syntheticsBulkDisableMonitorsItem')).not.toBeDisabled();
    expect(getByTestId('syntheticsBulkDeleteMonitorsItem')).not.toBeDisabled();

    for (const testId of [
      'syntheticsBulkEditTagsItem',
      'syntheticsBulkEditServiceNameItem',
      'syntheticsBulkEditLabelsItem',
      'syntheticsBulkEditLocationsItem',
      'syntheticsBulkEditScheduleItem',
      'syntheticsBulkMaintenanceWindowsItem',
    ]) {
      expect(getByTestId(testId)).toBeDisabled();
    }
  });

  it('keeps config edits enabled when the selection includes a ui-origin monitor', () => {
    const { getByTestId } = renderMenu([
      makeMonitor('ui-1'),
      makeMonitor('project-1', { origin: SourceType.PROJECT }),
    ]);

    expect(getByTestId('syntheticsBulkEditTagsItem')).not.toBeDisabled();
    expect(getByTestId('syntheticsBulkEditLocationsItem')).not.toBeDisabled();
  });

  it('renders a disabled bulk actions button when nothing is selected', () => {
    const { getByTestId } = render(
      <BulkOperations
        selectedItems={[]}
        setMonitorPendingDeletion={vi.fn()}
        setMonitorPendingReset={vi.fn()}
        setMonitorPendingStatusUpdate={setMonitorPendingStatusUpdate}
        setBulkEditAction={vi.fn()}
        setIsLocationsFlyoutOpen={vi.fn()}
        setIsScheduleFlyoutOpen={vi.fn()}
        setIsMaintenanceWindowsFlyoutOpen={vi.fn()}
      />
    );

    const button = getByTestId('syntheticsBulkActionsButton');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Bulk actions');
  });
});
