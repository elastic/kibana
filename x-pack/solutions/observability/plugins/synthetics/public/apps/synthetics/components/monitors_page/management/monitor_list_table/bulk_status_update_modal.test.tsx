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
import { fetchBulkUpdateMonitors } from '../../../../state';
import { useKibanaSpace } from '../../../../../../hooks/use_kibana_space';
import { BulkStatusUpdateModal } from './bulk_status_update_modal';

jest.mock('../../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: jest.fn(),
}));

jest.mock('../../../../state', () => ({
  ...jest.requireActual('../../../../state'),
  fetchBulkUpdateMonitors: jest.fn(),
}));

const useKibanaSpaceMock = useKibanaSpace as jest.MockedFunction<typeof useKibanaSpace>;
const fetchBulkUpdateMonitorsMock = fetchBulkUpdateMonitors as jest.MockedFunction<
  typeof fetchBulkUpdateMonitors
>;

const makeMonitor = (
  id: string,
  name: string,
  {
    origin = SourceType.UI,
    enabled = true,
    spaces,
  }: { origin?: SourceType; enabled?: boolean; spaces?: string[] } = {}
): EncryptedSyntheticsSavedMonitor =>
  ({
    [ConfigKey.CONFIG_ID]: id,
    [ConfigKey.NAME]: name,
    [ConfigKey.ENABLED]: enabled,
    [ConfigKey.MONITOR_SOURCE_TYPE]: origin,
    ...(spaces ? { [ConfigKey.KIBANA_SPACES]: spaces } : {}),
  } as unknown as EncryptedSyntheticsSavedMonitor);

describe('<BulkStatusUpdateModal />', () => {
  const onClose = jest.fn();
  const reloadPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaSpaceMock.mockReturnValue({ space: { id: 'default' } } as ReturnType<
      typeof useKibanaSpace
    >);
    fetchBulkUpdateMonitorsMock.mockResolvedValue({ result: [] });
  });

  const clickConfirm = (getByTestId: (id: string) => HTMLElement) => {
    fireEvent.click(getByTestId('confirmModalConfirmButton'));
  };

  it('splits eligible vs. skipped monitors and only patches the eligible ones', async () => {
    const monitors = [
      makeMonitor('ui-1', 'UI monitor 1', { enabled: false }),
      makeMonitor('ui-2', 'UI monitor 2', { enabled: false }),
      makeMonitor('project-1', 'Project monitor', { origin: SourceType.PROJECT, enabled: false }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [
        { id: 'ui-1', updated: true },
        { id: 'ui-2', updated: true },
      ],
    });

    const { getByText, getByTestId } = render(
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={true}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    // Title reflects only the 2 eligible (ui) monitors, not the skipped project one.
    expect(getByText('Enable 2 monitors?')).toBeInTheDocument();
    // Skipped project/terraform monitors are surfaced in a warning.
    expect(getByText('1 monitor will not be updated')).toBeInTheDocument();
    expect(getByText('Project monitor')).toBeInTheDocument();

    clickConfirm(getByTestId);

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
        spaceId: undefined,
        updates: [
          { id: 'ui-1', attributes: { [ConfigKey.ENABLED]: true } },
          { id: 'ui-2', attributes: { [ConfigKey.ENABLED]: true } },
        ],
      });
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('groups monitors by space and issues one request per space', async () => {
    // `home` lives in the current space, `away` only in another space (visible
    // via "show from all spaces"), and `shared` is shared to all spaces.
    const monitors = [
      makeMonitor('home', 'Home monitor', { enabled: false, spaces: ['default'] }),
      makeMonitor('away', 'Away monitor', { enabled: false, spaces: ['team-b'] }),
      makeMonitor('shared', 'Shared monitor', { enabled: false, spaces: ['*'] }),
    ];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'x', updated: true }],
    });

    const { getByTestId } = render(
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={true}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    clickConfirm(getByTestId);

    await waitFor(() => {
      expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledTimes(2);
    });
    // Current-space + all-spaces monitors are updated in the current space.
    expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
      spaceId: undefined,
      updates: [
        { id: 'home', attributes: { [ConfigKey.ENABLED]: true } },
        { id: 'shared', attributes: { [ConfigKey.ENABLED]: true } },
      ],
    });
    // The cross-space monitor is updated in the space it actually belongs to.
    expect(fetchBulkUpdateMonitorsMock).toHaveBeenCalledWith({
      spaceId: 'team-b',
      updates: [{ id: 'away', attributes: { [ConfigKey.ENABLED]: true } }],
    });
  });

  it('disables the confirm button when every selected monitor is skipped', () => {
    const monitors = [makeMonitor('project-1', 'Project monitor', { origin: SourceType.PROJECT })];

    const { getByTestId } = render(
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={false}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    expect(getByTestId('confirmModalConfirmButton')).toBeDisabled();
  });

  it('shows a success toast when all eligible monitors are updated', async () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1', { enabled: false })];
    fetchBulkUpdateMonitorsMock.mockResolvedValue({
      result: [{ id: 'ui-1', updated: true }],
    });

    const { getByTestId } = render(
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={true}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    clickConfirm(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: '1 monitor enabled successfully.' })
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
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={false}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    clickConfirm(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '1 disabled, 1 failed. Check that the failed monitors are editable and try again.',
        })
      );
    });
    expect(kibanaService.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('shows a danger toast when the request throws', async () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1', { enabled: false })];
    fetchBulkUpdateMonitorsMock.mockRejectedValue(new Error('network error'));

    const { getByTestId } = render(
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={true}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    clickConfirm(getByTestId);

    await waitFor(() => {
      expect(kibanaService.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to enable monitors. Please try again later.' })
      );
    });
    // Even on failure we still refresh and close the modal.
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancelled without hitting the API', () => {
    const monitors = [makeMonitor('ui-1', 'UI monitor 1', { enabled: false })];

    const { getByTestId } = render(
      <BulkStatusUpdateModal
        monitors={monitors}
        enabled={true}
        onClose={onClose}
        reloadPage={reloadPage}
      />
    );

    fireEvent.click(getByTestId('confirmModalCancelButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchBulkUpdateMonitorsMock).not.toHaveBeenCalled();
  });
});
