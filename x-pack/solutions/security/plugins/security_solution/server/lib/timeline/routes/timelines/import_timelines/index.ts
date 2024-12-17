/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extname } from 'path';
import type { Readable } from 'stream';
import { get } from 'lodash/fp';

import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_IMPORT_URL } from '../../../../../../common/constants';

import type { ConfigType } from '../../../../../config';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { importTimelines } from './helpers';
import {
  ImportTimelinesRequestBody,
  type ImportTimelinesResponse,
} from '../../../../../../common/api/timeline';
import { buildFrameworkRequest } from '../../../utils/common';

export { importTimelines } from './helpers';

export const importTimelinesRoute = (router: SecuritySolutionPluginRouter, config: ConfigType) => {
  router.versioned
    .post({
      path: `${TIMELINE_IMPORT_URL}`,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        body: {
          maxBytes: config.maxTimelineImportPayloadBytes,
          output: 'stream',
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidationWithZod(ImportTimelinesRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<ImportTimelinesResponse>> => {
        try {
          const siemResponse = buildSiemResponse(response);
          const savedObjectsClient = (await context.core).savedObjects.client;
          if (!savedObjectsClient) {
            return siemResponse.error({ statusCode: 404 });
          }

          const { file, isImmutable } = request.body;
          const filename = extractFilename(file);
          const fileExtension = extname(filename).toLowerCase();

          if (fileExtension !== '.ndjson') {
            return siemResponse.error({
              statusCode: 400,
              body: `Invalid file extension ${fileExtension}`,
            });
          }
          const frameworkRequest = await buildFrameworkRequest(context, request);

          const res = await importTimelines(
            file as unknown as Readable,
            config.maxTimelineImportExportSize,
            frameworkRequest,
            isImmutable === 'true'
          );
          if (res instanceof Error || typeof res === 'string') {
            throw res;
          } else {
            return response.ok({ body: res ?? {} });
          }
        } catch (err) {
          const error = transformError(err);
          const siemResponse = buildSiemResponse(response);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

function extractFilename(fileObj: unknown) {
  const filename = get('hapi.filename', fileObj);
  if (filename && typeof filename === 'string') {
    return filename;
  }
  throw new Error('`filename` missing in file');
}
