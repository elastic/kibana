/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import type { RouteContext } from '../../types';

/** Asserts that the current user holds the requested parameter privilege across all target spaces. */
export const assertCanMutateParamInAllSpaces = async (
  { request, response, server, spaceId }: RouteContext<unknown, unknown, unknown>,
  spaceIds: string[],
  action: 'update' | 'bulk_delete'
): Promise<{ ok: true } | { ok: false; errorResponse: IKibanaResponse }> => {
  const uniqueSpaces = [...new Set(spaceIds)];
  const checkPrivileges = server?.security?.authz?.checkSavedObjectsPrivilegesWithRequest;
  if (
    uniqueSpaces.length === 0 ||
    (!uniqueSpaces.includes(ALL_SPACES_ID) &&
      uniqueSpaces.length === 1 &&
      uniqueSpaces[0] === spaceId) ||
    !checkPrivileges
  ) {
    return { ok: true };
  }

  const { hasAllRequested } = await checkPrivileges(request)(
    `saved_object:${syntheticsParamType}/${action}`,
    uniqueSpaces
  );
  if (hasAllRequested) {
    return { ok: true };
  }

  const message =
    action === 'bulk_delete'
      ? i18n.translate('xpack.synthetics.params.multiSpaceDeleteErrorMessage', {
          defaultMessage:
            'This parameter is shared across spaces where you do not have delete permissions. To delete it, request access to all spaces.',
        })
      : i18n.translate('xpack.synthetics.params.multiSpaceUpdateErrorMessage', {
          defaultMessage:
            'This parameter is shared across spaces where you do not have update permissions. To save changes, request access to all spaces.',
        });

  return { ok: false, errorResponse: response.forbidden({ body: { message } }) };
};
