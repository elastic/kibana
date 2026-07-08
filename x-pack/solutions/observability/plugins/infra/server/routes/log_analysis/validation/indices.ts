/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncMapWithLimit } from '@kbn/std';

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import type { InfraBackendLibs } from '../../../lib/infra_types';

import { logAnalysisValidationV1 } from '../../../../common/http_api';

// Bound the number of concurrent field_caps requests fanned out per request.
const MAX_CONCURRENT_INDEX_QUERIES = 10;

export const initValidateLogAnalysisIndicesRoute = ({ framework }: InfraBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logAnalysisValidationV1.LOG_ANALYSIS_VALIDATE_INDICES_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(
              logAnalysisValidationV1.validationIndicesRequestPayloadRT
            ),
          },
        },
      },
      async (requestContext, request, response) => {
        const {
          data: { fields, indices, runtimeMappings },
        } = request.body;

        const errors: logAnalysisValidationV1.ValidationIndicesError[] = [];

        // Deduplicate the user-provided indices and fields to avoid redundant queries.
        const uniqueIndices = [...new Set(indices)];
        const uniqueFields = [...new Map(fields.map((field) => [field.name, field])).values()];

        // Query each pattern individually, to map correctly the errors
        await asyncMapWithLimit(uniqueIndices, MAX_CONCURRENT_INDEX_QUERIES, async (index) => {
          const fieldCaps = await (
            await requestContext.core
          ).elasticsearch.client.asCurrentUser.fieldCaps({
            allow_no_indices: true,
            fields: uniqueFields.map((field) => field.name),
            ignore_unavailable: true,
            index,
            runtime_mappings: runtimeMappings,
          });

          if (fieldCaps.indices.length === 0) {
            errors.push({
              error: 'INDEX_NOT_FOUND',
              index,
            });
            return;
          }

          uniqueFields.forEach(({ name: fieldName, validTypes }) => {
            const fieldMetadata = fieldCaps.fields[fieldName];

            if (fieldMetadata === undefined) {
              errors.push({
                error: 'FIELD_NOT_FOUND',
                index,
                field: fieldName,
              });
            } else {
              const fieldTypes = Object.keys(fieldMetadata);

              if (!fieldTypes.every((fieldType) => validTypes.includes(fieldType))) {
                errors.push({
                  error: `FIELD_NOT_VALID`,
                  index,
                  field: fieldName,
                });
              }
            }
          });
        });

        return response.ok({
          body: logAnalysisValidationV1.validationIndicesResponsePayloadRT.encode({
            data: { errors },
          }),
        });
      }
    );
};
