/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { syntheticsMonitorSavedObjectType } from '../../../common/types/saved_objects';
import { RouteContext } from '../types';

type MonitorSavedObjectBulkAction = 'bulk_update' | 'bulk_delete';

/** Asserts that the current user has the requested privileges in all specified spaces. */
export const assertCanPerformMonitorBulkActionInAllSpaces = async (
  routeContext: RouteContext,
  spaceIds: string[],
  savedObjectType: string = syntheticsMonitorSavedObjectType,
  action: MonitorSavedObjectBulkAction = 'bulk_update'
) => {
  const { request, response, server, spaceId } = routeContext;

  const uniqueSpaces = [...new Set(spaceIds)];
  const hasAllSpaces = uniqueSpaces.includes(ALL_SPACES_ID);

  if (!hasAllSpaces && uniqueSpaces.length <= 1 && uniqueSpaces[0] === spaceId) {
    return;
  }
  if (uniqueSpaces.length === 0) {
    return;
  }

  const checkSavedObjectsPrivileges =
    server.security.authz.checkSavedObjectsPrivilegesWithRequest(request);

  const { hasAllRequested } = await checkSavedObjectsPrivileges(
    `saved_object:${savedObjectType}/${action}`,
    uniqueSpaces
  );

  if (!hasAllRequested) {
    const isDeleteAction = action === 'bulk_delete';
    return response.forbidden({
      body: {
        message: isDeleteAction
          ? i18n.translate('xpack.synthetics.validation.multiSpaceDeletePermissions', {
              defaultMessage:
                'This monitor is shared to spaces where you do not have delete permissions. To delete it, request access to those spaces.',
            })
          : i18n.translate('xpack.synthetics.validation.multiSpacePermissions', {
              defaultMessage:
                'This monitor is shared to spaces where you do not have update permissions. To save changes, either request access to those spaces or remove them from the monitor.',
            }),
      },
    });
  }
};
