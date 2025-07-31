/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { APIRoutes } from '../common/api_routes';

import { DEFAULT_PAGE_VALUE } from '../common/pagination';
import { deleteRuleset } from './lib/delete_query_rules_ruleset';
import { deleteRulesetRule } from './lib/delete_query_rules_ruleset_rule';
import { fetchIndices } from './lib/fetch_indices';
import { fetchQueryRulesQueryRule } from './lib/fetch_query_rules_query_rule';
import { fetchQueryRulesRuleset } from './lib/fetch_query_rules_ruleset';
import { fetchQueryRulesSets } from './lib/fetch_query_rules_sets';
import { isQueryRulesetExist } from './lib/is_query_ruleset_exist';
import { putRuleset } from './lib/put_query_rules_ruleset_set';
import { errorHandler } from './utils/error_handler';
import { checkPrivileges } from './utils/privilege_check';

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

      if (!rulesetData) {
        return response.notFound({
          body: i18n.translate('xpack.search.rules.api.routes.rulesetNotFoundErrorMessage', {
            defaultMessage: 'Ruleset not found',
          }),
        });
      }
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
        body: schema.maybe(
          schema.object({
            rules: schema.arrayOf(
              schema.object({
                rule_id: schema.string(),
                type: schema.string(),
                criteria: schema.arrayOf(
                  schema.object({
                    type: schema.string(),
                    metadata: schema.maybe(schema.string()),
                    values: schema.maybe(schema.arrayOf(schema.string())),
                  })
                ),
                actions: schema.object({
                  ids: schema.maybe(schema.arrayOf(schema.string())),
                  docs: schema.maybe(
                    schema.arrayOf(
                      schema.object({
                        _id: schema.string(),
                        _index: schema.string(),
                      })
                    )
                  ),
                }),
              })
            ),
          })
        ),
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
      const rules = request.body?.rules as QueryRulesQueryRuleset['rules'];
      const isExisting = await isQueryRulesetExist(asCurrentUser, rulesetId);
      if (isExisting && !forceWrite) {
        return response.customError({
          statusCode: 409,
          body: i18n.translate('xpack.search.rules.api.routes.rulesetAlreadyExistsErrorMessage', {
            defaultMessage: `Ruleset {rulesetId} already exists. Use forceWrite=true to overwrite it.`,
            values: { rulesetId },
          }),
        });
      }
      const result = await putRuleset(asCurrentUser, rulesetId, rules);
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
      path: APIRoutes.QUERY_RULES_RULESET_EXISTS,
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
          rulesetId: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { rulesetId } = request.params;
      const core = await context.core;
      const {
        client: { asCurrentUser },
      } = core.elasticsearch;

      await checkPrivileges(core, response);

      const isExisting = await isQueryRulesetExist(asCurrentUser, rulesetId);

      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: { exists: isExisting },
      });
    })
  );

  router.delete(
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
      const rulesetId = request.params.ruleset_id;
      const result = await deleteRuleset(asCurrentUser, rulesetId);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: result,
      });
    })
  );

  router.delete(
    {
      path: APIRoutes.QUERY_RULES_RULESET_RULE,
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
          rule_id: schema.string(),
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
      const rulesetId = request.params.ruleset_id;
      const ruleId = request.params.rule_id;
      const result = await deleteRulesetRule(asCurrentUser, rulesetId, ruleId);
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
      path: APIRoutes.QUERY_RULES_QUERY_RULE_FETCH,
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
          rule_id: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { rule_id: ruleId, ruleset_id: rulesetId } = request.params;
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
      const ruleData = await fetchQueryRulesQueryRule(asCurrentUser, rulesetId, ruleId);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: ruleData,
      });
    })
  );

  router.get(
    {
      path: APIRoutes.FETCH_INDICES,
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
          searchQuery: schema.maybe(schema.string()),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { searchQuery } = request.query;
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
      const { indexNames } = await fetchIndices(asCurrentUser, searchQuery);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: indexNames,
      });
    })
  );
  router.get(
    {
      path: APIRoutes.FETCH_DOCUMENT,
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
          indexName: schema.string(),
          documentId: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { indexName, documentId } = request.params;
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
      try {
        const document = await asCurrentUser.get({
          index: indexName,
          id: documentId,
        });
        const mappings = await asCurrentUser.indices.getMapping({
          index: indexName,
        });
        return response.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: {
            document,
            mappings,
          },
        });
      } catch (error) {
        if (error.statusCode === 404) {
          return response.notFound({
            body: `Document with ID ${documentId} not found in index ${indexName}`,
          });
        }
        throw error;
      }
    })
  );
  router.post(
    {
      path: APIRoutes.GENERATE_RULE_ID,
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
          rulesetId: schema.string(),
        }),
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const { rulesetId } = request.params;
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

      for (let i = 0; i < 100; i++) {
        const ruleId = `rule-${Math.floor(Math.random() * 10000)
          .toString()
          .slice(-4)}`;
        // check if it is existing by fetching the rule
        try {
          await asCurrentUser.queryRules.getRule({ ruleset_id: rulesetId, rule_id: ruleId });
        } catch (error) {
          // if the rule does not exist return the ruleId
          if (error.statusCode === 404) {
            return response.ok({
              headers: {
                'content-type': 'application/json',
              },
              body: { ruleId },
            });
          }
          throw error;
        }
      }
      return response.customError({
        statusCode: 409,
        body: i18n.translate('xpack.search.rules.api.routes.generateRuleIdErrorMessage', {
          defaultMessage: 'Failed to generate a unique rule ID after 100 attempts.',
        }),
      });
    })
  );
}
