/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { getMaintenanceWindowsRoute } from './get_maintenance_windows';
import type { RouteContext } from '../types';
import { PRIVATE_LOCATIONS_SYNC_TASK_ID } from '../../tasks/sync_private_locations_monitors_task';

const mw = (id: string) => ({
  id,
  title: `MW ${id}`,
  status: 'upcoming',
  updatedAt: '2024-06-01T10:00:00.000Z',
  extra: 'dropped',
});

const buildContext = (taskManager = taskManagerMock.createStart()) =>
  ({
    server: {
      pluginsStart: { taskManager },
      getMaintenanceWindowClientInternal: () => ({
        find: jest.fn().mockResolvedValue({ data: [mw('mw-1'), mw('mw-unreferenced')] }),
      }),
    },
    request: {},
    spaceId: 'default',
    monitorConfigRepository: {
      getAll: jest.fn().mockResolvedValue([{ attributes: { maintenance_windows: ['mw-1'] } }]),
    },
  } as unknown as RouteContext);

describe('getMaintenanceWindowsRoute', () => {
  it('returns only referenced windows with the sync status of the private location sync task', async () => {
    const taskManager = taskManagerMock.createStart();
    (taskManager.get as jest.Mock).mockResolvedValue({
      state: { lastSuccessfulSyncAt: '2024-06-01T10:05:00.000Z', disableAutoSync: false },
    });

    const result = await getMaintenanceWindowsRoute().handler(buildContext(taskManager));

    expect(taskManager.get).toHaveBeenCalledWith(PRIVATE_LOCATIONS_SYNC_TASK_ID);
    expect(result).toEqual({
      maintenanceWindows: [
        {
          id: 'mw-1',
          title: 'MW mw-1',
          status: 'upcoming',
          updatedAt: '2024-06-01T10:00:00.000Z',
        },
      ],
      lastSuccessfulSyncAt: '2024-06-01T10:05:00.000Z',
      autoSyncDisabled: false,
    });
  });

  it('omits the sync status when the task does not exist yet', async () => {
    const taskManager = taskManagerMock.createStart();
    (taskManager.get as jest.Mock).mockRejectedValue(new Error('not found'));

    const result = await getMaintenanceWindowsRoute().handler(buildContext(taskManager));

    expect(result).toEqual({ maintenanceWindows: [expect.objectContaining({ id: 'mw-1' })] });
  });
});
