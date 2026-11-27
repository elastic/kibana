/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_ALL, RULES_API_READ } from '@kbn/security-solution-features/constants';
import type { GapReasonType } from '@kbn/alerting-plugin/common/constants/gap_reason';
import { EXCLUDED_GAP_REASONS_KEY } from '../../../../../common/constants';
import {
  BulkAssignRuleSetsRequestBody,
  CreateRuleSetRequestBody,
  DeletePrivateRuleSetRequestParams,
  DeleteRuleSetRequestParams,
  FindRuleSetsRequestQuery,
  GetRuleSetGapsSummaryRequestBody,
  GetRuleSetRequestParams,
  GetRuleSetsMembershipRequestBody,
  PreviewRuleSetRequestBody,
  RULE_SETS_API_VERSION,
  RULE_SETS_BULK_ASSIGN_URL,
  RULE_SETS_GAPS_SUMMARY_URL,
  RULE_SETS_INTERNAL_API_VERSION,
  RULE_SETS_MEMBERSHIP_URL,
  RULE_SETS_PREVIEW_URL,
  RULE_SETS_PRIVATE_URL,
  RULE_SETS_URL,
  RULE_SET_PRIVATE_URL,
  RULE_SET_URL,
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

/** Administrator actions on other users' private sets need the Elasticsearch `manage_security` privilege. */
const assertCanManageSecurity = async (
  context: SecuritySolutionRequestHandlerContext
): Promise<void> => {
  const ctx = await context.resolve(['core']);
  const { has_all_requested: allowed } =
    await ctx.core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
      cluster: ['manage_security'],
    });
  if (!allowed) {
    throw Boom.forbidden('This action needs the manage_security cluster privilege');
  }
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

const registerPublicRoutes = (router: SecuritySolutionPluginRouter): void => {
  router.versioned.get({ access: 'public', path: RULE_SETS_URL, security: readAuthz }).addVersion(
    {
      version: RULE_SETS_API_VERSION,
      validate: { request: { query: buildRouteValidationWithZod(FindRuleSetsRequestQuery) } },
    },
    async (context, request, response) =>
      handle(response, async () => {
        const client = await getRuleSetsClient(context);
        const data = await client.list({ withCounts: request.query.with_counts ?? true });
        return { data, total: data.length };
      })
  );

  router.versioned.post({ access: 'public', path: RULE_SETS_URL, security: writeAuthz }).addVersion(
    {
      version: RULE_SETS_API_VERSION,
      validate: { request: { body: buildRouteValidationWithZod(CreateRuleSetRequestBody) } },
    },
    async (context, request, response) =>
      handle(response, async () => (await getRuleSetsClient(context)).create(request.body))
  );

  router.versioned.get({ access: 'public', path: RULE_SET_URL, security: readAuthz }).addVersion(
    {
      version: RULE_SETS_API_VERSION,
      validate: { request: { params: buildRouteValidationWithZod(GetRuleSetRequestParams) } },
    },
    async (context, request, response) =>
      handle(response, async () => (await getRuleSetsClient(context)).get(request.params.id))
  );

  router.versioned.put({ access: 'public', path: RULE_SET_URL, security: writeAuthz }).addVersion(
    {
      version: RULE_SETS_API_VERSION,
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
    .delete({ access: 'public', path: RULE_SET_URL, security: writeAuthz })
    .addVersion(
      {
        version: RULE_SETS_API_VERSION,
        validate: { request: { params: buildRouteValidationWithZod(DeleteRuleSetRequestParams) } },
      },
      async (context, request, response) =>
        handle(response, async () => {
          await (await getRuleSetsClient(context)).delete(request.params.id);
          return undefined;
        })
    );
};

const registerInternalRoutes = (router: SecuritySolutionPluginRouter): void => {
  router.versioned
    .post({ access: 'internal', path: RULE_SETS_PREVIEW_URL, security: readAuthz })
    .addVersion(
      {
        version: RULE_SETS_INTERNAL_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(PreviewRuleSetRequestBody) } },
      },
      async (context, request, response) =>
        handle(response, async () => (await getRuleSetsClient(context)).preview(request.body))
    );

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_MEMBERSHIP_URL, security: readAuthz })
    .addVersion(
      {
        version: RULE_SETS_INTERNAL_API_VERSION,
        validate: {
          request: { body: buildRouteValidationWithZod(GetRuleSetsMembershipRequestBody) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => ({
          rule_sets: await (await getRuleSetsClient(context)).membership(request.body.ids),
        }))
    );

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_BULK_ASSIGN_URL, security: writeAuthz })
    .addVersion(
      {
        version: RULE_SETS_INTERNAL_API_VERSION,
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

  router.versioned
    .post({ access: 'internal', path: RULE_SETS_GAPS_SUMMARY_URL, security: readAuthz })
    .addVersion(
      {
        version: RULE_SETS_INTERNAL_API_VERSION,
        validate: {
          request: { body: buildRouteValidationWithZod(GetRuleSetGapsSummaryRequestBody) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          const ctx = await context.resolve(['core']);
          const excludedReasons = await ctx.core.uiSettings.client.get<GapReasonType[]>(
            EXCLUDED_GAP_REASONS_KEY
          );
          return (await getRuleSetsClient(context)).getGapsSummary(request.body, excludedReasons);
        })
    );

  router.versioned
    .get({ access: 'internal', path: RULE_SETS_PRIVATE_URL, security: writeAuthz })
    .addVersion(
      { version: RULE_SETS_INTERNAL_API_VERSION, validate: false },
      async (context, _request, response) =>
        handle(response, async () => {
          await assertCanManageSecurity(context);
          return { data: await (await getRuleSetsClient(context)).findAllPrivate() };
        })
    );

  router.versioned
    .delete({ access: 'internal', path: RULE_SET_PRIVATE_URL, security: writeAuthz })
    .addVersion(
      {
        version: RULE_SETS_INTERNAL_API_VERSION,
        validate: {
          request: { params: buildRouteValidationWithZod(DeletePrivateRuleSetRequestParams) },
        },
      },
      async (context, request, response) =>
        handle(response, async () => {
          await assertCanManageSecurity(context);
          await (await getRuleSetsClient(context)).deletePrivate(request.params.id);
          return undefined;
        })
    );
};

export const registerRuleSetsRoutes = (router: SecuritySolutionPluginRouter): void => {
  registerPublicRoutes(router);
  registerInternalRoutes(router);
};
