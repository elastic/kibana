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

const { MAX_CONCURRENT_INDEX_QUERIES } = logAnalysisValidationV1;

interface DeduplicateFieldsSuccess {
  type: 'success';
  fields: logAnalysisValidationV1.ValidationIndicesFieldSpecification[];
}

interface DeduplicateFieldsConflict {
  type: 'conflict';
  conflictingFieldName: string;
}

type DeduplicateFieldsResult = DeduplicateFieldsSuccess | DeduplicateFieldsConflict;

// Deduplicate the user-provided field specifications by name. Duplicate names
// with identical `validTypes` collapse to a single specification, while
// duplicate names with conflicting `validTypes` are reported so the request can
// fail loudly instead of silently changing validation semantics.
const deduplicateFields = (
  fields: logAnalysisValidationV1.ValidationIndicesFieldSpecification[]
): DeduplicateFieldsResult => {
  const fieldsByName = new Map<
    string,
    logAnalysisValidationV1.ValidationIndicesFieldSpecification
  >();

  for (const field of fields) {
    const existingField = fieldsByName.get(field.name);

    if (existingField === undefined) {
      fieldsByName.set(field.name, field);
      continue;
    }

    const existingValidTypes = [...existingField.validTypes].sort();
    const currentValidTypes = [...field.validTypes].sort();

    const hasConflictingValidTypes =
      existingValidTypes.length !== currentValidTypes.length ||
      existingValidTypes.some((validType, index) => validType !== currentValidTypes[index]);

    if (hasConflictingValidTypes) {
      return { type: 'conflict', conflictingFieldName: field.name };
    }
  }

  return { type: 'success', fields: [...fieldsByName.values()] };
};

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

        // Deduplicate the user-provided indices and fields to avoid redundant queries.
        const uniqueIndices = [...new Set(indices)];
        const deduplicatedFields = deduplicateFields(fields);

        if (deduplicatedFields.type === 'conflict') {
          return response.badRequest({
            body: {
              message: `The field "${deduplicatedFields.conflictingFieldName}" was specified multiple times with conflicting valid types.`,
            },
          });
        }

        const uniqueFields = deduplicatedFields.fields;

        // Query each pattern individually, to map correctly the errors. Collect
        // the errors per index and flatten them afterwards so the response order
        // stays deterministic regardless of the concurrent query completion order.
        const errorsByIndex = await asyncMapWithLimit(
          uniqueIndices,
          MAX_CONCURRENT_INDEX_QUERIES,
          async (index) => {
            const indexErrors: logAnalysisValidationV1.ValidationIndicesError[] = [];

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
              indexErrors.push({
                error: 'INDEX_NOT_FOUND',
                index,
              });
              return indexErrors;
            }

            uniqueFields.forEach(({ name: fieldName, validTypes }) => {
              const fieldMetadata = fieldCaps.fields[fieldName];

              if (fieldMetadata === undefined) {
                indexErrors.push({
                  error: 'FIELD_NOT_FOUND',
                  index,
                  field: fieldName,
                });
              } else {
                const fieldTypes = Object.keys(fieldMetadata);

                if (!fieldTypes.every((fieldType) => validTypes.includes(fieldType))) {
                  indexErrors.push({
                    error: `FIELD_NOT_VALID`,
                    index,
                    field: fieldName,
                  });
                }
              }
            });

            return indexErrors;
          }
        );

        // `asyncMapWithLimit` preserves input order, so flattening yields a
        // deterministic ordering that follows the deduplicated index order.
        const errors = errorsByIndex.flat();

        return response.ok({
          body: logAnalysisValidationV1.validationIndicesResponsePayloadRT.encode({
            data: { errors },
          }),
        });
      }
    );
};
