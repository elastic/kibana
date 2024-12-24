/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extname } from 'path';

import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  ImportExceptionListRequestQuery,
  ImportExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';
import { ConfigType } from '../config';

import { buildSiemResponse, getExceptionListClient } from './utils';

/**
 * Takes an ndjson file of exception lists and exception list items and
 * imports them by either creating or updating lists/items given a clients
 * choice to overwrite any matching lists
 */
export const importExceptionsRoute = (router: ListsPluginRouter, config: ConfigType): void => {
  router.versioned
    .post({
      access: 'public',
      options: {
        body: {
          maxBytes: config.maxImportPayloadBytes,
          output: 'stream',
        },
      },
      path: `${EXCEPTION_LIST_URL}/_import`,
      security: {
        authz: {
          requiredPrivileges: ['lists-all'],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            body: schema.any(), // validation on file object is accomplished later in the handler.
            query: buildRouteValidationWithZod(ImportExceptionListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const exceptionListsClient = await getExceptionListClient(context);
        const siemResponse = buildSiemResponse(response);

        try {
          const { filename } = request.body.file.hapi;
          const fileExtension = extname(filename).toLowerCase();

          if (fileExtension !== '.ndjson') {
            return siemResponse.error({
              body: `Invalid file extension ${fileExtension}`,
              statusCode: 400,
            });
          }

          const importsSummary = await exceptionListsClient.importExceptionListAndItems({
            exceptionsToImport: request.body.file,
            generateNewListId: request.query.as_new_list,
            maxExceptionsImportSize: config.maxExceptionsImportSize,
            overwrite: request.query.overwrite,
          });

          return response.ok({ body: ImportExceptionListResponse.parse(importsSummary) });
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
