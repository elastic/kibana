/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RequestHandler,
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { protectionUpdatesNoteSavedObjectType } from '../../lib/protection_updates_note/saved_object_mappings';
import type {
  CreateUpdateProtectionUpdatesNoteSchema,
  GetProtectionUpdatesNoteSchema,
} from '../../../../common/api/endpoint/protection_updates_note';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';

const getProtectionNote = async (SOClient: SavedObjectsClientContract, packagePolicyId: string) => {
  return SOClient.find<{ note: string }>({
    type: protectionUpdatesNoteSavedObjectType,
    hasReference: { type: PACKAGE_POLICY_SAVED_OBJECT_TYPE, id: packagePolicyId },
  });
};

const updateProtectionNote = async (
  SOClient: SavedObjectsClientContract,
  noteId: string,
  note: string,
  references: SavedObjectReference[]
) => {
  return SOClient.update(
    protectionUpdatesNoteSavedObjectType,
    noteId,
    {
      note,
    },
    {
      references,
      refresh: 'wait_for',
    }
  );
};

const createProtectionNote = async (
  SOClient: SavedObjectsClientContract,
  note: string,
  references: SavedObjectReference[]
) => {
  return SOClient.create(
    protectionUpdatesNoteSavedObjectType,
    {
      note,
    },
    {
      references,
      refresh: 'wait_for',
    }
  );
};

async function getSavedObjectClient(
  context: SecuritySolutionRequestHandlerContext,
  endpointContext: EndpointAppContext,
  packagePolicyId: string
): Promise<SavedObjectsClientContract> {
  const { endpointManagementSpaceAwarenessEnabled } = endpointContext.experimentalFeatures;
  if (!endpointManagementSpaceAwarenessEnabled) {
    return (await context.core).savedObjects.client;
  }

  const spaceId = (await context.securitySolution).getSpaceId();
  const scopedFleetService = endpointContext.service.getInternalFleetServices(spaceId);
  await scopedFleetService.ensureInCurrentSpace({ integrationPolicyIds: [packagePolicyId] });
  const unscopedFleetService = endpointContext.service.getInternalFleetServices(undefined, true);
  return unscopedFleetService.getSoClient();
}

export const postProtectionUpdatesNoteHandler = function (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof CreateUpdateProtectionUpdatesNoteSchema.params>,
  undefined,
  TypeOf<typeof CreateUpdateProtectionUpdatesNoteSchema.body>,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, request, response) => {
    const { package_policy_id: packagePolicyId } = request.params;
    let SOClient: SavedObjectsClientContract;
    let soClientResponse: Awaited<ReturnType<typeof getProtectionNote>>;

    const logger = endpointContext.logFactory.get('protectionUpdatesNote');

    try {
      SOClient = await getSavedObjectClient(context, endpointContext, packagePolicyId);
      soClientResponse = await getProtectionNote(SOClient, packagePolicyId);
    } catch (err) {
      return errorHandler(logger, response, err);
    }

    const { note } = request.body;
    if (soClientResponse.saved_objects[0]) {
      const { references } = soClientResponse.saved_objects[0];
      let updatedNoteSO: Awaited<ReturnType<typeof updateProtectionNote>>;

      try {
        updatedNoteSO = await updateProtectionNote(
          SOClient,
          soClientResponse.saved_objects[0].id,
          note,
          references
        );
      } catch (err) {
        return errorHandler(logger, response, err);
      }

      const { attributes } = updatedNoteSO;

      return response.ok({ body: attributes });
    }

    const references: SavedObjectReference[] = [
      {
        id: packagePolicyId,
        name: 'package_policy',
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      },
    ];

    let noteSO: Awaited<ReturnType<typeof createProtectionNote>>;
    try {
      noteSO = await createProtectionNote(SOClient, note, references);
    } catch (err) {
      return errorHandler(logger, response, err);
    }

    const { attributes } = noteSO;

    return response.ok({ body: attributes });
  };
};

export const getProtectionUpdatesNoteHandler = function (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof GetProtectionUpdatesNoteSchema.params>,
  undefined,
  undefined,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, request, response) => {
    const { package_policy_id: packagePolicyId } = request.params;
    let SOClient: SavedObjectsClientContract;
    let soClientResponse: Awaited<ReturnType<typeof getProtectionNote>>;

    try {
      SOClient = await getSavedObjectClient(context, endpointContext, packagePolicyId);
      soClientResponse = await getProtectionNote(SOClient, packagePolicyId);
    } catch (err) {
      const logger = endpointContext.logFactory.get('protectionUpdatesNote');
      return errorHandler(logger, response, err);
    }

    if (!soClientResponse.saved_objects[0] || !soClientResponse.saved_objects[0].attributes) {
      return response.notFound({ body: { message: 'No note found for this policy' } });
    }

    const { attributes } = soClientResponse.saved_objects[0];

    return response.ok({ body: attributes });
  };
};
