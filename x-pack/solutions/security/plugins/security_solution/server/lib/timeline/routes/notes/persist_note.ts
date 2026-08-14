/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import {
  PersistNoteRouteRequestBody,
  type PersistNoteRouteResponse,
} from '../../../../../common/api/timeline';
import { persistNote } from '../../saved_object/notes';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';

export const persistNoteRoute = (
  router: SecuritySolutionPluginRouter,
  eventBus?: SecuritySolutionEventBus
) => {
  router.versioned
    .patch({
      path: NOTE_URL,
      security: {
        authz: {
          requiredPrivileges: ['notes_write'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithZod(PersistNoteRouteRequestBody) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<PersistNoteRouteResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const { note } = request.body;
          const noteId = request.body?.noteId ?? null;

          const res = await persistNote({
            request: frameworkRequest,
            noteId,
            note,
            overrideOwner: true,
          });

          if (eventBus && note.eventId) {
            const securitySolution = await context.securitySolution;
            const spaceId = securitySolution?.getSpaceId() ?? 'default';
            if (noteId == null) {
              void eventBus.emitNoteCreated(request, {
                noteId: res.note.noteId ?? '',
                noteContent: note.note ?? '',
                createdBy: res.note.createdBy ?? '',
                documentId: note.eventId,
                spaceId,
              });
            } else {
              void eventBus.emitNoteUpdated(request, {
                noteId: res.note.noteId ?? '',
                noteContent: note.note ?? '',
                updatedBy: res.note.updatedBy ?? res.note.createdBy ?? '',
                documentId: note.eventId,
                spaceId,
              });
            }
          }

          return response.ok({
            body: res,
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
