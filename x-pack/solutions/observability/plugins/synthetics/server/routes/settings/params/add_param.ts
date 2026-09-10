/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type {
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';
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

const ParamsObjectSchema = schema.object({
  key: schema.string({
    minLength: 1,
  }),
  value: schema.string({
    minLength: 1,
  }),
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

      const savedObjectsData = parseParamBody(
        spaceId,
        request.body as SyntheticsParamRequest[] | SyntheticsParamRequest
      );

      const conflictingKey = await findConflictingParamKey(savedObjectsClient, savedObjectsData);
      if (conflictingKey) {
        return response.conflict({
          body: {
            message: `A synthetics global parameter with the key "${conflictingKey}" already exists.`,
          },
        });
      }

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

// `synthetics-param` mappings are `dynamic: false`, so `key` cannot be queried
// server-side; fetch the params visible in the target namespaces and compare in memory.
// Keys are checked per namespace scope so a mixed bulk request (shared + space-local)
// does not widen the search for space-local keys to all spaces via `*`.
// Best effort only: params use generated ids and `key` is not indexed, so nothing enforces
// uniqueness on write and concurrent creates of the same key can still both succeed.
const findConflictingParamKey = async (
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsData: Array<SavedObjectsBulkCreateObject<Omit<SyntheticsParamSOAttributes, 'id'>>>
): Promise<string | undefined> => {
  const requestedKeys = savedObjectsData.map((obj) => obj.attributes.key);

  const seenKeys = new Set<string>();
  for (const key of requestedKeys) {
    if (seenKeys.has(key)) {
      return key;
    }
    seenKeys.add(key);
  }

  const keysByNamespaceScope = new Map<string, { namespaces: string[]; keys: string[] }>();
  for (const obj of savedObjectsData) {
    const namespaces = obj.initialNamespaces ?? [];
    const scopeKey = JSON.stringify(namespaces);
    const group = keysByNamespaceScope.get(scopeKey) ?? { namespaces, keys: [] };
    group.keys.push(obj.attributes.key);
    keysByNamespaceScope.set(scopeKey, group);
  }

  for (const { namespaces, keys } of keysByNamespaceScope.values()) {
    const conflictingKey = await findConflictingKeyInNamespaces(
      savedObjectsClient,
      keys,
      namespaces
    );
    if (conflictingKey) {
      return conflictingKey;
    }
  }

  return undefined;
};

const findConflictingKeyInNamespaces = async (
  savedObjectsClient: SavedObjectsClientContract,
  requestedKeys: string[],
  namespaces: string[]
): Promise<string | undefined> => {
  const finder = savedObjectsClient.createPointInTimeFinder<
    Omit<SyntheticsParamSOAttributes, 'id'>
  >({
    type: syntheticsParamType,
    perPage: 1000,
    ...(namespaces.length ? { namespaces } : {}),
  });

  const existingKeys = new Set<string>();
  for await (const { saved_objects: savedObjects } of finder.find()) {
    for (const { attributes } of savedObjects) {
      existingKeys.add(attributes.key);
    }
  }
  await finder.close();

  return requestedKeys.find((key) => existingKeys.has(key));
};

const toClientResponse = (savedObject: SavedObject<Omit<SyntheticsParamSOAttributes, 'id'>>) => {
  const { id, attributes: data, namespaces } = savedObject;
  const { description, key, tags } = data;
  return {
    id,
    description,
    key,
    namespaces,
    tags,
    value: data.value,
  };
};

const parseParamBody = (
  spaceId: string,
  body: SyntheticsParamRequest[] | SyntheticsParamRequest
): Array<SavedObjectsBulkCreateObject<Omit<SyntheticsParamSOAttributes, 'id'>>> => {
  if (Array.isArray(body)) {
    const params = body as SyntheticsParamRequest[];
    return params.map((param) => {
      const { share_across_spaces: shareAcrossSpaces, ...data } = param;
      return {
        type: syntheticsParamType,
        attributes: data,
        initialNamespaces: shareAcrossSpaces ? [ALL_SPACES_ID] : [spaceId],
      };
    });
  }

  const { share_across_spaces: shareAcrossSpaces, ...data } = body;
  return [
    {
      type: syntheticsParamType,
      attributes: data,
      initialNamespaces: shareAcrossSpaces ? [ALL_SPACES_ID] : [spaceId],
    },
  ];
};
