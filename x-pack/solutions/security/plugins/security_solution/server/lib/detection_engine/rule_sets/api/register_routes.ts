/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_ALL, RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  BulkAssignRuleSetsRequestBody,
  CreateRuleSetRequestBody,
  DeleteRuleSetRequestParams,
  FindRuleSetsRequestQuery,
  GetRuleSetsMembershipRequestBody,
  PreviewRuleSetRequestBody,
  RULE_SETS_BULK_ASSIGN_URL,
  RULE_SETS_MEMBERSHIP_URL,
  RULE_SETS_PREVIEW_URL,
  RULE_SETS_URL,
  RULE_SET_URL,
  RULE_SET_RULE_IDS_URL,
  UpdateRuleSetRequestBody,
  UpdateRuleSetRequestParams,
} from '../../../../../common/api/detection_engine/rule_sets';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { buildSiemResponse } from '../../routes/utils';
import { RuleSetsClient } from '../logic/rule_sets_client';

export const getRuleSetsClient = async (
  context: SecuritySolutionRequestHandlerContext
): Promise<RuleSetsClient> => {
  const ctx = await context.resolve(['core', 'alerting']);
  return new RuleSetsClient(
    ctx.core.savedObjects.client,
    await ctx.alerting.getRulesClient(),
    ctx.core.security.authc.getCurrentUser()?.profile_uid
  );
};

/** Runs a handler and turns errors (Boom, saved objects errors) into the usual SIEM error body. */
const handle = async (
  response: KibanaResponseFactory,
  run: () => Promise<object | undefined>
): Promise<IKibanaResponse> => {
  const siemResponse = buildSiemResponse(response);
  try {
    const body = await run();
    return response.ok(body ? { body } : {});
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({ body: error.message, statusCode: error.statusCode });
  }
};

const readAuthz = { authz: { requiredPrivileges: [RULES_API_READ] } };
const writeAuthz = { authz: { requiredPrivileges: [RULES_API_ALL] } };

export const registerRuleSetsRoutes = (router: SecuritySolutionPluginRouter): void => {
  router.versioned.get({ access: 'internal', path: RULE_SETS_URL, security: readAuthz }).addVersion(
    {
      version: '1',
      validate: { request: { query: buildRouteValidationWithZod(FindRuleSetsRequestQuery) } },
    },
    async (context, request, response) =>
      handle(response, async () => {
        const client = await getRuleSetsClient(context);
        return { groups: await client.find({ withCounts: request.query.with_counts ?? true }) };
      })
  );

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithZod(CreateRuleSetRequestBody) } },
      },
      async (context, request, response) =>
        handle(response, async () => (await getRuleSetsClient(context)).create(request.body))
    );

  router.versioned.put({ access: 'internal', path: RULE_SET_URL, security: writeAuthz }).addVersion(
    {
      version: '1',
      validate: {
        request: {
          params: buildRouteValidationWithZod(UpdateRuleSetRequestParams),
          body: buildRouteValidationWithZod(UpdateRuleSetRequestBody),
        },
      },
    },
    async (context, request, response) =>
      handle(response, async () => {
        const { version, ...definition } = request.body;
        return (await getRuleSetsClient(context)).update(request.params.id, definition, version);
      })
  );

  router.versioned
    .delete({ access: 'internal', path: RULE_SET_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(DeleteRuleSetRequestParams) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          await (await getRuleSetsClient(context)).delete(request.params.id);
          return undefined;
        })
    );

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_PREVIEW_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithZod(PreviewRuleSetRequestBody) } },
      },
      async (context, request, response) =>
        handle(response, async () => (await getRuleSetsClient(context)).preview(request.body))
    );

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_MEMBERSHIP_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithZod(GetRuleSetsMembershipRequestBody) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => ({
          groups: await (await getRuleSetsClient(context)).membership(request.body.ids),
        }))
    );

  router.versioned
    .get({ access: 'internal', path: RULE_SET_RULE_IDS_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(DeleteRuleSetRequestParams) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => ({
          ids: await (await getRuleSetsClient(context)).getRuleIds(request.params.id),
        }))
    );

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_BULK_ASSIGN_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithZod(BulkAssignRuleSetsRequestBody) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          const { ids, add_to: addTo, remove_from: removeFrom } = request.body;
          return {
            updated: await (
              await getRuleSetsClient(context)
            ).bulkAssign({ ids, addTo, removeFrom }),
          };
        })
    );
};
