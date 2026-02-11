/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { API_VERSIONS, UPDATE_ANONYMIZATION_FIELDS_URL } from '@kbn/elastic-assistant-common';
import type { ElasticAssistantPluginRouter } from '../../types';

export const updateAnonymizationFieldsRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: UPDATE_ANONYMIZATION_FIELDS_URL,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: {} },
      async (context, request, response) => {
        const assistantContext = await context.elasticAssistant;
        const siemResponse = buildSiemResponse(response);

        try {
          await assistantContext.updateAnonymizationFields();
          return response.ok({ body: { success: true } });
        } catch (e) {
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
