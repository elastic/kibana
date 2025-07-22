/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostPackagePolicyPostDeleteCallback } from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import pMap from 'p-map';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { stringify } from '../../endpoint/utils/stringify';
import { catchAndWrapError } from '../../endpoint/utils';
import { protectionUpdatesNoteSavedObjectType } from '../../endpoint/lib/protection_updates_note/saved_object_mappings';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

export const removeProtectionUpdatesNote = async (
  endpointServices: EndpointAppContextService,
  policy: Parameters<PostPackagePolicyPostDeleteCallback>[0][0]
) => {
  const logger = endpointServices.createLogger('removeProtectionUpdatesNote');

  logger.debug(`Processing policy [${policy.id}]`);

  const isSpacesEnabled =
    endpointServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled;
  const soClient = isSpacesEnabled
    ? endpointServices.savedObjects.createInternalUnscopedSoClient(false)
    : endpointServices.savedObjects.createInternalScopedSoClient({ readonly: false });

  if (policy.id) {
    const foundProtectionUpdatesNotes = await soClient
      .find({
        type: protectionUpdatesNoteSavedObjectType,
        hasReference: {
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          id: policy.id,
        },
        namespaces: isSpacesEnabled ? ['*'] : undefined,
      })
      .catch(
        catchAndWrapError.withMessage(
          `Attempt to find [${protectionUpdatesNoteSavedObjectType}] saved objects referencing policy [${policy.id}] failed`
        )
      );

    logger.debug(
      `Found [${foundProtectionUpdatesNotes.total}] saved objects referencing [${policy.id}]`
    );

    await pMap(foundProtectionUpdatesNotes.saved_objects, (protectionUpdatesNote) => {
      logger.debug(() => `Deleting protections note:\n${stringify(protectionUpdatesNote)}`);

      const soClientForUpdate = isSpacesEnabled
        ? endpointServices.savedObjects.createInternalScopedSoClient({
            spaceId: protectionUpdatesNote.namespaces?.at(0) ?? DEFAULT_SPACE_ID,
            readonly: false,
          })
        : soClient;

      return soClientForUpdate
        .delete(protectionUpdatesNoteSavedObjectType, protectionUpdatesNote.id, {
          // Force delete across all spaces
          force: true,
        })
        .catch(
          catchAndWrapError.withMessage(
            `Attempt to delete SO [${protectionUpdatesNoteSavedObjectType}][${protectionUpdatesNote.id}] failed`
          )
        );
    });
  }

  logger.debug(`Done processing policy [${policy.id}]`);
};
