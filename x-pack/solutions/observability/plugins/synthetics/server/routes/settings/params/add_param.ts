/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SavedObject, SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import type {
  SyntheticsParamRequest,
  SyntheticsParams,
  SyntheticsParamSOAttributes,
} from '../../../../common/runtime_types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import {
  buildVaultReference,
  VaultParamSourceSchema,
} from '../../../synthetics_service/formatters/vault_param_formatter';

const ParamsObjectSchema = schema.object({
  key: schema.string({
    minLength: 1,
    maxLength: 1024,
  }),
  // Either `value` (literal) or `source` (vault-backed) must be provided.
  value: schema.maybe(
    schema.string({
      minLength: 1,
    })
  ),
  source: schema.maybe(VaultParamSourceSchema),
  description: schema.maybe(schema.string()),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  share_across_spaces: schema.maybe(schema.boolean()),
});

export const addSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsParams | SyntheticsParams[]
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PARAMS,
  validate: {},
  validation: {
    request: {
      body: schema.oneOf([ParamsObjectSchema, schema.arrayOf(ParamsObjectSchema)]),
    },
  },
  handler: async ({ request, response, server, savedObjectsClient }) => {
    try {
      const { id: spaceId } = (await server.spaces?.spacesService.getActiveSpace(request)) ?? {
        id: DEFAULT_SPACE_ID,
      };

      const paramsToValidate = Array.isArray(request.body) ? request.body : [request.body];
      const invalid = (paramsToValidate as SyntheticsParamRequest[]).find(
        (param) => !param.value && !param.source
      );
      if (invalid) {
        return response.badRequest({
          body: { message: `Param "${invalid.key}" must have either a value or a vault source` },
        });
      }

      const savedObjectsData = parseParamBody(
        spaceId,
        request.body as SyntheticsParamRequest[] | SyntheticsParamRequest
      );

      const result = await savedObjectsClient.bulkCreate<Omit<SyntheticsParamSOAttributes, 'id'>>(
        savedObjectsData
      );

      const modifiedParamKeys = savedObjectsData.map((obj) => obj.attributes.key);

      await asyncGlobalParamsPropagation({
        server,
        paramsSpacesToSync: Array.from(
          new Set(
            savedObjectsData.reduce(
              (spacesToSync, obj) => spacesToSync.concat(obj.initialNamespaces || []),
              [] as string[]
            )
          )
        ),
        modifiedParamKeys,
      });

      if (savedObjectsData.length > 1) {
        const failedResult = result.saved_objects.find(isSavedObjectErrorResult);
        if (failedResult) {
          throw Object.assign(new Error(failedResult.error.message), failedResult.error);
        }
        return result.saved_objects
          .filter(
            (savedObject): savedObject is SavedObject<Omit<SyntheticsParamSOAttributes, 'id'>> =>
              !isSavedObjectErrorResult(savedObject)
          )
          .map((savedObject) => toClientResponse(savedObject));
      } else {
        const [savedObject] = result.saved_objects;
        if (isSavedObjectErrorResult(savedObject)) {
          throw Object.assign(new Error(savedObject.error.message), savedObject.error);
        }
        return toClientResponse(savedObject);
      }
    } catch (error) {
      if (error.output?.statusCode === 404) {
        const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        return response.notFound({
          body: { message: `Kibana space '${spaceId}' does not exist` },
        });
      }

      throw error;
    }
  },
});

const toClientResponse = (savedObject: SavedObject<Omit<SyntheticsParamSOAttributes, 'id'>>) => {
  const { id, attributes: data, namespaces } = savedObject;
  const { description, key, tags, source } = data;
  return {
    id,
    description,
    key,
    namespaces,
    tags,
    value: data.value,
    source,
  };
};

/**
 * Builds the stored SO attributes for a param request. For a vault-backed param
 * the effective `value` is derived as an edge-resolved reference token
 * (${vault/<path>#<field>}) and the structured `source` is persisted so the UI
 * can round-trip it. Kibana never resolves the reference — Heartbeat does.
 */
const toParamAttributes = (
  param: SyntheticsParamRequest
): Omit<SyntheticsParamSOAttributes, 'id'> => {
  const { share_across_spaces: _shareAcrossSpaces, value, source, ...rest } = param;
  const effectiveValue = source
    ? buildVaultReference(source.path, source.field, source.connection)
    : value ?? '';
  return {
    ...rest,
    ...(source ? { source } : {}),
    value: effectiveValue,
  };
};

const parseParamBody = (
  spaceId: string,
  body: SyntheticsParamRequest[] | SyntheticsParamRequest
): Array<SavedObjectsBulkCreateObject<Omit<SyntheticsParamSOAttributes, 'id'>>> => {
  const params = Array.isArray(body) ? body : [body];
  return params.map((param) => ({
    type: syntheticsParamType,
    attributes: toParamAttributes(param),
    initialNamespaces: param.share_across_spaces ? [ALL_SPACES_ID] : [spaceId],
  }));
};
