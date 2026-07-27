/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { TinesToWorkflowMapper } from '../../../../../common/siem_migrations/parsers/tines';
import { SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import {
  TranslateWorkflowRequestBody,
  type TranslateWorkflowResponse,
} from '../../../../../common/siem_migrations/workflows/types';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from '../../common/api/util/with_license';
import { authz } from './util/authz';

export const registerSiemWorkflowMigrationsTranslateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_WORKFLOW_MIGRATIONS_TRANSLATE_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(TranslateWorkflowRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<TranslateWorkflowResponse>> => {
          try {
            const result = TinesToWorkflowMapper.map(req.body.story);

            return res.ok({
              body: {
                yaml: result.yaml,
                report: result.report,
                validation: result.validation,
              },
            });
          } catch (error) {
            logger.error(error);
            return res.badRequest({
              body: error instanceof Error ? error.message : String(error),
            });
          }
        }
      )
    );
};
