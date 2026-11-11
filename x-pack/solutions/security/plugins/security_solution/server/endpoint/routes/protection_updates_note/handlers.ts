/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RequestHandler,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { protectionUpdatesNoteSavedObjectType } from '../../lib/protection_updates_note/saved_object_mappings';
import type {
  CreateUpdateProtectionUpdatesNoteSchema,
  GetProtectionUpdatesNoteSchema,
} from '../../../../common/api/endpoint/protection_updates_note';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';

type ProtectionNoteSavedObject = SavedObject<{ note: string }>;

const getProtectionNote = async (SOClient: SavedObjectsClientContract, packagePolicyId: string) => {
  return SOClient.find<{ note: string }>({
    type: protectionUpdatesNoteSavedObjectType,
    hasReference: [
      { type: PACKAGE_POLICY_SAVED_OBJECT_TYPE, id: packagePolicyId },
      { type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, id: packagePolicyId },
    ],
    hasReferenceOperator: 'OR',
    namespaces: ['*'],
  });
};

const getProtectionNoteSpaceId = (note: ProtectionNoteSavedObject): string =>
  note.namespaces?.at(0) ?? DEFAULT_SPACE_ID;

const pickProtectionNote = (
  notes: ProtectionNoteSavedObject[]
): ProtectionNoteSavedObject | undefined => {
  return notes.find((note) => getProtectionNoteSpaceId(note) === DEFAULT_SPACE_ID) ?? notes.at(0);
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
  const spaceId = (await context.securitySolution).getSpaceId();
  const scopedFleetService = endpointContext.service.getInternalFleetServices(spaceId);
  await scopedFleetService.ensureInCurrentSpace({ integrationPolicyIds: [packagePolicyId] });
  const unscopedFleetService = endpointContext.service.getInternalFleetServices(undefined, true);
  return unscopedFleetService.getSoClient();
}

const getWritableSoClient = (
  endpointContext: EndpointAppContext,
  spaceId: string
): SavedObjectsClientContract => {
  return endpointContext.service.savedObjects.createInternalScopedSoClient({
    spaceId,
    readonly: false,
  });
};

export const postProtectionUpdatesNoteHandler =
  (
    endpointContext: EndpointAppContext
  ): RequestHandler<
    TypeOf<typeof CreateUpdateProtectionUpdatesNoteSchema.params>,
    undefined,
    TypeOf<typeof CreateUpdateProtectionUpdatesNoteSchema.body>,
    SecuritySolutionRequestHandlerContext
  > =>
  async (context, request, response) => {
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
    const existingNote = pickProtectionNote(soClientResponse.saved_objects);

    if (existingNote) {
      const { references } = existingNote;
      const noteSpaceId = getProtectionNoteSpaceId(existingNote);
      let updatedNoteSO: Awaited<ReturnType<typeof updateProtectionNote>>;

      try {
        updatedNoteSO = await updateProtectionNote(
          getWritableSoClient(endpointContext, noteSpaceId),
          existingNote.id,
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
      noteSO = await createProtectionNote(
        getWritableSoClient(endpointContext, DEFAULT_SPACE_ID),
        note,
        references
      );
    } catch (err) {
      return errorHandler(logger, response, err);
    }

    const { attributes } = noteSO;

    return response.ok({ body: attributes });
  };

export const getProtectionUpdatesNoteHandler =
  (
    endpointContext: EndpointAppContext
  ): RequestHandler<
    TypeOf<typeof GetProtectionUpdatesNoteSchema.params>,
    undefined,
    undefined,
    SecuritySolutionRequestHandlerContext
  > =>
  async (context, request, response) => {
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

    const existingNote = pickProtectionNote(soClientResponse.saved_objects);

    if (!existingNote?.attributes) {
      return response.notFound({ body: { message: 'No note found for this policy' } });
    }

    const { attributes } = existingNote;

    return response.ok({ body: attributes });
  };
