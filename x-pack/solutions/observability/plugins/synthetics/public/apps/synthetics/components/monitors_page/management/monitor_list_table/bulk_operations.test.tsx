/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('../../../../../../hooks/use_capabilities', () => ({
  ...jest.requireActual('../../../../../../hooks/use_capabilities'),
  useCanEditSynthetics: jest.fn(),
  useCanUsePublicLocationsPermission: jest.fn(),
}));

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useEnablement: jest.fn(),
}));

jest.mock('../../../common/hooks/use_monitor_integration_health', () => ({
  useMonitorIntegrationHealth: jest.fn(),
}));

const useCanEditSyntheticsMock = useCanEditSynthetics as jest.MockedFunction<
  typeof useCanEditSynthetics
>;
const useCanUsePublicLocationsPermissionMock =
  useCanUsePublicLocationsPermission as jest.MockedFunction<
    typeof useCanUsePublicLocationsPermission
  >;
const useEnablementMock = useEnablement as jest.MockedFunction<typeof useEnablement>;
const useMonitorIntegrationHealthMock = useMonitorIntegrationHealth as jest.MockedFunction<
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
  const setMonitorPendingStatusUpdate = jest.fn();

  const renderMenu = (selectedItems: EncryptedSyntheticsSavedMonitor[]) => {
    const utils = render(
      <BulkOperations
        selectedItems={selectedItems}
        setMonitorPendingDeletion={jest.fn()}
        setMonitorPendingReset={jest.fn()}
        setMonitorPendingStatusUpdate={setMonitorPendingStatusUpdate}
      />
    );
    fireEvent.click(utils.getByTestId('syntheticsBulkActionsButton'));
    return utils;
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('counts only eligible (ui) monitors, ignoring project/terraform ones', () => {
    const { getByTestId } = renderMenu([
      makeMonitor('ui-1', { enabled: false }),
      makeMonitor('project-1', { origin: SourceType.PROJECT, enabled: false }),
    ]);

    const enableItem = getByTestId('syntheticsBulkEnableMonitorsItem');
    expect(enableItem).toHaveTextContent('Enable 1 monitor');
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
    const { getByTestId } = renderMenu([
      makeMonitor('project-1', { origin: SourceType.PROJECT, enabled: false }),
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
});
