/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_SKILL_URL_TEMPLATE,
  type WatchSkill,
} from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { storeUnavailableResponse } from '../store_route_guard';

const UpdateSkillRequestParams = z.object({
  skillId: z.string().min(1).max(128),
});

/** Toggles the skill's global flag. Per-watch attachments are patched via PATCH /watches/{id}. */
const UpdateSkillRequestBody = z.object({
  enabled: z.boolean(),
});

export const registerUpdateSkillRoute = ({
  router,
  logger,
  config,
  getWatchesService,
}: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_SKILL_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PND_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Update a PND skill',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateSkillRequestParams),
            body: buildRouteValidationWithZod(UpdateSkillRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          if (!config.ui.useMockData) {
            return storeUnavailableResponse(response);
          }

          const { skillId } = request.params;
          const skill = getWatchesService().setSkillEnabled(skillId, request.body.enabled);
          if (!skill) {
            return response.notFound({
              body: { message: `Skill "${skillId}" not found` },
            });
          }

          const body: { skill: WatchSkill } = { skill };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to update skill: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update skill' },
          });
        }
      }
    );
};
