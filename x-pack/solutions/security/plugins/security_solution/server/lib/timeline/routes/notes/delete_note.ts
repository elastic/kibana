/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import { DeleteNoteRequestBody } from '../../../../../common/api/timeline';
import { deleteNote } from '../../saved_object/notes';

export const deleteNoteRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .delete({
      path: NOTE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithZod(DeleteNoteRequestBody) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          if (!request.body) {
            throw new Error('Missing request body');
          }
          let noteIds: string[] = [];
          if ('noteId' in request.body) {
            noteIds = [request.body.noteId];
          } else if ('noteIds' in request.body && Array.isArray(request.body.noteIds)) {
            noteIds = request.body.noteIds;
          }

          await deleteNote({
            request: frameworkRequest,
            noteIds,
          });

          return response.ok();
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
