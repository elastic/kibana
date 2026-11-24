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
  BulkAssignRuleGroupsRequestBody,
  CreateRuleGroupRequestBody,
  DeleteRuleGroupRequestParams,
  FindRuleGroupsRequestQuery,
  GetRuleGroupsMembershipRequestBody,
  PreviewRuleGroupRequestBody,
  RULE_GROUPS_BULK_ASSIGN_URL,
  RULE_GROUPS_MEMBERSHIP_URL,
  RULE_GROUPS_PREVIEW_URL,
  RULE_GROUPS_URL,
  RULE_GROUP_URL,
  RULE_GROUP_RULE_IDS_URL,
  UpdateRuleGroupRequestBody,
  UpdateRuleGroupRequestParams,
} from '../../../../../common/api/detection_engine/rule_groups';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { buildSiemResponse } from '../../routes/utils';
import { RuleGroupsClient } from '../logic/rule_groups_client';

export const getRuleGroupsClient = async (
  context: SecuritySolutionRequestHandlerContext
): Promise<RuleGroupsClient> => {
  const ctx = await context.resolve(['core', 'alerting']);
  return new RuleGroupsClient(
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

export const registerRuleGroupsRoutes = (router: SecuritySolutionPluginRouter): void => {
  router.versioned
    .get({ access: 'internal', path: RULE_GROUPS_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: { request: { query: buildRouteValidationWithZod(FindRuleGroupsRequestQuery) } },
      },
      async (context, request, response) =>
        handle(response, async () => {
          const client = await getRuleGroupsClient(context);
          return { groups: await client.find({ withCounts: request.query.with_counts ?? true }) };
        })
    );

  router.versioned
    .post({ access: 'internal', path: RULE_GROUPS_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithZod(CreateRuleGroupRequestBody) } },
      },
      async (context, request, response) =>
        handle(response, async () => (await getRuleGroupsClient(context)).create(request.body))
    );

  router.versioned
    .put({ access: 'internal', path: RULE_GROUP_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateRuleGroupRequestParams),
            body: buildRouteValidationWithZod(UpdateRuleGroupRequestBody),
          },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          const { version, ...definition } = request.body;
          return (await getRuleGroupsClient(context)).update(
            request.params.id,
            definition,
            version
          );
        })
    );

  router.versioned
    .delete({ access: 'internal', path: RULE_GROUP_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(DeleteRuleGroupRequestParams) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          await (await getRuleGroupsClient(context)).delete(request.params.id);
          return undefined;
        })
    );

  router.versioned
    .post({ access: 'internal', path: RULE_GROUPS_PREVIEW_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithZod(PreviewRuleGroupRequestBody) } },
      },
      async (context, request, response) =>
        handle(response, async () => (await getRuleGroupsClient(context)).preview(request.body))
    );

  router.versioned
    .post({ access: 'internal', path: RULE_GROUPS_MEMBERSHIP_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithZod(GetRuleGroupsMembershipRequestBody) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => ({
          groups: await (await getRuleGroupsClient(context)).membership(request.body.ids),
        }))
    );

  router.versioned
    .get({ access: 'internal', path: RULE_GROUP_RULE_IDS_URL, security: readAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(DeleteRuleGroupRequestParams) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => ({
          ids: await (await getRuleGroupsClient(context)).getRuleIds(request.params.id),
        }))
    );

  router.versioned
    .post({ access: 'internal', path: RULE_GROUPS_BULK_ASSIGN_URL, security: writeAuthz })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithZod(BulkAssignRuleGroupsRequestBody) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          const { ids, add_to: addTo, remove_from: removeFrom } = request.body;
          return {
            updated: await (
              await getRuleGroupsClient(context)
            ).bulkAssign({ ids, addTo, removeFrom }),
          };
        })
    );
};
