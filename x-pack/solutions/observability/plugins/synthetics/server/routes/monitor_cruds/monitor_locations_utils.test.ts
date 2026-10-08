/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertCanPerformMonitorBulkActionInAllSpaces } from './monitor_locations_utils';
import { RouteContext } from '../types';

describe('assertCanPerformMonitorBulkActionInAllSpaces', () => {
  const createRouteContext = (hasAllRequested: boolean) => {
    const checkSavedObjectsPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
    const forbidden = jest.fn(({ body }) => ({ status: 403, body }));

    return {
      routeContext: {
        request: {},
        response: { forbidden },
        spaceId: 'default',
        server: {
          security: {
            authz: {
              checkSavedObjectsPrivilegesWithRequest: jest
                .fn()
                .mockReturnValue(checkSavedObjectsPrivileges),
            },
          },
        },
      } as unknown as RouteContext,
      checkSavedObjectsPrivileges,
    };
  };

  it('checks bulk_update privileges by default', async () => {
    const { routeContext, checkSavedObjectsPrivileges } = createRouteContext(true);

    await assertCanPerformMonitorBulkActionInAllSpaces(routeContext, ['default', 'other-space']);

    expect(checkSavedObjectsPrivileges).toHaveBeenCalledWith(
      'saved_object:synthetics-monitor-multi-space/bulk_update',
      ['default', 'other-space']
    );
  });

  it('checks bulk_delete privileges and returns delete-specific copy', async () => {
    const { routeContext, checkSavedObjectsPrivileges } = createRouteContext(false);

    const result = await assertCanPerformMonitorBulkActionInAllSpaces(
      routeContext,
      ['default', 'other-space'],
      'synthetics-monitor',
      'bulk_delete'
    );

    expect(checkSavedObjectsPrivileges).toHaveBeenCalledWith(
      'saved_object:synthetics-monitor/bulk_delete',
      ['default', 'other-space']
    );
    expect(result).toEqual({
      status: 403,
      body: {
        message:
          'This monitor is shared to spaces where you do not have delete permissions. To delete it, request access to those spaces.',
      },
    });
  });

  it('does not check privileges when no spaces are provided', async () => {
    const { routeContext, checkSavedObjectsPrivileges } = createRouteContext(true);

    await assertCanPerformMonitorBulkActionInAllSpaces(routeContext, []);

    expect(checkSavedObjectsPrivileges).not.toHaveBeenCalled();
  });
});
