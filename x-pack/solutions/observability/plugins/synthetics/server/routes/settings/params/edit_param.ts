/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { z } from '@kbn/zod';
import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import {
  findUnknownConnections,
  unknownConnectionsMessage,
} from '../secret_connection/connection_utils';
import { MAX_PARAM_VALUE_LENGTH, MAX_ROUTE_ID_LENGTH, routeId } from '../../zod_query';
import { validateRouteSpaceName } from '../../common';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import type { SyntheticsParamRequest, SyntheticsParams } from '../../../../common/runtime_types';
import { syntheticsParamType } from '../../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import {
  buildVaultReference,
  findMalformedVaultReferences,
  malformedVaultReferencesMessage,
  VaultParamSourceSchema,
} from '../../../synthetics_service/formatters/vault_param_formatter';

const RequestParamsSchema = z.strictObject({
  id: routeId.describe('The unique identifier for the parameter.'),
});

type RequestParams = z.infer<typeof RequestParamsSchema>;

export const editSyntheticsParamsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsParams | undefined,
  RequestParams
> = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.PARAMS + '/{id}',
  options: {
    summary: 'Update a parameter',
    description:
      'Update a parameter in the Synthetics app.\n\nYou must have `all` privileges for the Synthetics feature in the Observability section of the Kibana feature privileges.',
    operationId: 'put-parameter',
    oasOperationObject: () => path.join(__dirname, 'examples/put_parameter.yaml'),
  },
  validate: {},
  validation: {
    request: {
      params: RequestParamsSchema,
      body: z
        .strictObject({
          key: z
            .string()
            .min(1)
            .max(MAX_ROUTE_ID_LENGTH)
            .optional()
            .describe('The key of the parameter.'),
          value: z
            .string()
            .min(1)
            .max(MAX_PARAM_VALUE_LENGTH)
            .optional()
            .describe('The updated value associated with the parameter.'),
          source: VaultParamSourceSchema.optional().describe(
            'Resolve the value from HashiCorp Vault at runtime instead of storing it.'
          ),
          description: z
            .string()
            .max(4096)
            .optional()
            .describe('The updated description of the parameter.'),
          tags: z
            .array(z.string().max(256))
            .max(100)
            .optional()
            .describe('An array of updated tags to categorize the parameter.'),
        })
        .describe('The request body cannot be empty; at least one attribute is required.'),
    },
  },
  handler: async (routeContext) => {
    const { savedObjectsClient, request, response, spaceId, server } = routeContext;
    const { invalidResponse } = await validateRouteSpaceName(routeContext);
    if (invalidResponse) return invalidResponse;

    const { id: paramId } = request.params;
    const data = request.body as SyntheticsParamRequest;
    if (isEmpty(data)) {
      return response.badRequest({ body: { message: 'Request body cannot be empty' } });
    }
    // D4: a parameter is either a literal value or a vault source, not both.
    if (data.value && data.source) {
      return response.badRequest({
        body: { message: 'A parameter cannot set both a value and a vault source' },
      });
    }
    const malformed = findMalformedVaultReferences(data.value);
    if (malformed.length > 0) {
      return response.badRequest({
        body: {
          message: `The parameter has a malformed Vault reference: ${malformedVaultReferencesMessage(
            malformed
          )}`,
        },
      });
    }
    if (data.source) {
      const unknownConnections = await findUnknownConnections(routeContext, [
        data.source.connection,
      ]);
      if (unknownConnections.length > 0) {
        return response.badRequest({
          body: { message: unknownConnectionsMessage(unknownConnections) },
        });
      }
    }
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

    try {
      const existingParam =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsParams>(
          syntheticsParamType,
          paramId,
          { namespace: spaceId }
        );

      const newParam: SyntheticsParams = {
        ...existingParam.attributes,
        ...data,
      };

      // For a vault-backed edit, derive the effective value from the source and
      // persist the structured source. When switching (back) to a literal value,
      // drop any previously-stored vault source.
      let clearingSource = false;
      if (data.source) {
        newParam.value = buildVaultReference(
          data.source.path,
          data.source.field,
          data.source.connection
        );
        newParam.source = data.source;
      } else if (data.value) {
        newParam.value = data.value;
        delete newParam.source;
        clearingSource = true;
      }

      const { key: existingKey } = existingParam.attributes;

      // A merge update never removes an absent key, so clearing `source` (vault →
      // literal) would leave a stale `source` on the stored doc — the UI would keep
      // showing the Vault badge and the param would still look vault-backed. Replace
      // the full attribute set in that case so `source` is actually dropped.
      const {
        id: responseId,
        attributes: { key, tags, description, value, source },
        namespaces,
      } = (await savedObjectsClient.update<SyntheticsParams>(
        syntheticsParamType,
        paramId,
        newParam,
        clearingSource ? { mergeAttributes: false } : undefined
      )) as SavedObject<SyntheticsParams>;

      // Include both old and new key if the key was renamed
      const modifiedParamKeys = existingKey !== key ? [existingKey, key] : [key];

      await asyncGlobalParamsPropagation({
        server,
        paramsSpacesToSync: existingParam.namespaces || [spaceId],
        modifiedParamKeys,
      });

      return { id: responseId, key, tags, description, namespaces, value, source };
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return response.notFound({ body: { message: 'Param not found' } });
      }
    }
  },
});
