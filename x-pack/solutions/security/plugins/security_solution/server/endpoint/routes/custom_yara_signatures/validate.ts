/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type {
  ValidateCustomYaraSignatureRequestBody,
  ValidateCustomYaraSignatureResponse,
} from '../../../../common/api/endpoint/custom_yara_signatures';
import { ValidateCustomYaraSignatureRequestSchema } from '../../../../common/api/endpoint/custom_yara_signatures';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '../../../../common/endpoint/constants';
import {
  validateCustomYaraRule,
  YARA_ENGINE_INTERNAL_ERROR_MESSAGE,
} from '../../lib/custom_yara_signatures';
import { EndpointHttpError } from '../../errors';
import type { EndpointAppContext } from '../../types';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { errorHandler } from '../error_handler';

export const getValidateCustomYaraSignatureRequestHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<
  unknown,
  unknown,
  ValidateCustomYaraSignatureRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppServices.createLogger('validateCustomYaraSignatureRouteHandler');

  return async (_context, req, res) => {
    try {
      const { yara_rule: yaraRule, os_types: osTypes } = req.body;
      const result = await validateCustomYaraRule(yaraRule, osTypes);

      const body: ValidateCustomYaraSignatureResponse = {
        errors: result.errors,
        warnings: result.warnings,
        error_count: result.errorCount,
        warning_count: result.warningCount,
      };

      return res.ok({ body });
    } catch (err) {
      logger.error(err);
      return errorHandler(
        logger,
        res,
        new EndpointHttpError(YARA_ENGINE_INTERNAL_ERROR_MESSAGE, 500)
      );
    }
  };
};

export const registerValidateCustomYaraSignatureRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .post({
      access: 'internal',
      path: CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: ValidateCustomYaraSignatureRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteCustomYaraSignatures'] },
        endpointContext.logFactory.get('validateCustomYaraSignatureRoute'),
        getValidateCustomYaraSignatureRequestHandler(endpointContext.service)
      )
    );
};
