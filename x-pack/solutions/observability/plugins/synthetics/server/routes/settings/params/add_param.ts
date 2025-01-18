/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SavedObject, SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { SyntheticsRestApiRouteFactory } from '../../types';
import {
  SyntheticsParamRequest,
  SyntheticsParams,
  SyntheticsParamSOAttributes,
} from '../../../../common/runtime_types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

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

      const result = await savedObjectsClient.bulkCreate<Omit<SyntheticsParamSOAttributes, 'id'>>(
        savedObjectsData
      );

      if (savedObjectsData.length > 1) {
        return result.saved_objects.map((savedObject) => {
          return toClientResponse(savedObject);
        });
      } else {
        return toClientResponse(result.saved_objects[0]);
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
