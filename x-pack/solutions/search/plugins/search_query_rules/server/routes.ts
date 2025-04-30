/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { APIRoutes } from '../common/api_routes';

import { errorHandler } from './utils/error_handler';
import { fetchQueryRulesSets } from './lib/fetch_query_rules_sets';
import { DEFAULT_PAGE_VALUE } from '../common/pagination';
import { fetchQueryRulesRuleset } from './lib/fetch_query_rules_ruleset';
import { putRuleset } from './lib/put_query_rules_ruleset_set';

export function defineRoutes({ logger, router }: { logger: Logger; router: IRouter }) {
  router.get(
    {
      path: APIRoutes.QUERY_RULES_SETS,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_search_query_rules'],
        },
      },
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: DEFAULT_PAGE_VALUE.from }),
          size: schema.number({ defaultValue: DEFAULT_PAGE_VALUE.size }),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      const {
        client: { asCurrentUser },
      } = core.elasticsearch;
      const user = core.security.authc.getCurrentUser();
      if (!user) {
        return response.customError({
          statusCode: 502,
          body: 'Could not retrieve current user, security plugin is not ready',
        });
      }
      const hasSearchQueryRulesPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_query_rules'],
      });
      if (!hasSearchQueryRulesPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_query_rules privileges",
        });
      }
      const result = await fetchQueryRulesSets(asCurrentUser, {
        from: request.query.from,
        size: request.query.size,
      });
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: result,
      });
    })
  );
  router.get(
    {
      path: APIRoutes.QUERY_RULES_RULESET_ID,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_search_query_rules'],
        },
      },
      validate: {
        params: schema.object({
          ruleset_id: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      const {
        client: { asCurrentUser },
      } = core.elasticsearch;
      const user = core.security.authc.getCurrentUser();
      if (!user) {
        return response.customError({
          statusCode: 502,
          body: 'Could not retrieve current user, security plugin is not ready',
        });
      }
      const hasSearchQueryRulesPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_query_rules'],
      });
      if (!hasSearchQueryRulesPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_query_rules privileges",
        });
      }
      const rulesetData = await fetchQueryRulesRuleset(asCurrentUser, request.params.ruleset_id);

      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: rulesetData,
      });
    })
  );
  router.put(
    {
      path: APIRoutes.QUERY_RULES_RULESET_ID,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_search_query_rules'],
        },
      },
      validate: {
        params: schema.object({
          ruleset_id: schema.string(),
        }),
        query: schema.object({
          forceWrite: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      const {
        client: { asCurrentUser },
      } = core.elasticsearch;
      const user = core.security.authc.getCurrentUser();
      if (!user) {
        return response.customError({
          statusCode: 502,
          body: 'Could not retrieve current user, security plugin is not ready',
        });
      }
      const hasSearchQueryRulesPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_query_rules'],
      });
      if (!hasSearchQueryRulesPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_query_rules privileges",
        });
      }
      const rulesetId = request.params.ruleset_id;
      const forceWrite = request.query.forceWrite;
      const isExisting = await fetchQueryRulesRuleset(asCurrentUser, rulesetId);
      if (isExisting && !forceWrite) {
        return response.customError({
          statusCode: 409,
          body: i18n.translate('xpack.search.rules.api.routes.rulesetAlreadyExistsErrorMessage', {
            defaultMessage: `Ruleset {rulesetId} already exists. Use forceWrite=true to overwrite it.`,
            values: { rulesetId },
          }),
        });
      }
      const result = await putRuleset(asCurrentUser, rulesetId);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: result,
      });
    })
  );
}
