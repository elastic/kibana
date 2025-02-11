/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { APIRoutes } from '../common/api_routes';

import { errorHandler } from './utils/error_handler';
import { fetchSynonymSets } from './lib/fetch_synonym_sets';
import { DEFAULT_PAGE_VALUE } from '../common/pagination';
import { deleteSynonymsSet } from './lib/delete_synonyms_set';
import { fetchSynonymsSet } from './lib/fetch_synonyms_set';
import { deleteSynonymRule } from './lib/delete_synonym_rule';
import { fetchSynonymRule } from './lib/fetch_synonym_rule';
import { putSynonymsSet } from './lib/put_synonyms_set';
import { fetchUniqueRuleId } from './lib/fetch_unique_rule_id';
import { putSynonymsRule } from './lib/put_synonyms_rule';

export function defineRoutes({ logger, router }: { logger: Logger; router: IRouter }) {
  router.get(
    {
      path: APIRoutes.SYNONYM_SETS,
      options: {
        access: 'internal',
        tags: ['synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:read'],
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });
      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }
      const result = await fetchSynonymSets(asCurrentUser, {
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

  router.delete(
    {
      path: APIRoutes.SYNONYM_SET_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:write', 'synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:write', 'synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
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
      const synonymsSetId = request.params.synonymsSetId;
      const result = await deleteSynonymsSet(asCurrentUser, synonymsSetId);
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
      path: APIRoutes.SYNONYM_SET_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
        }),
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });

      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }

      const synonymsSetId = request.params.synonymsSetId;
      const result = await fetchSynonymsSet(asCurrentUser, synonymsSetId, {
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
      path: APIRoutes.SYNONYM_SET_ID_RULE_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
          ruleId: schema.string(),
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });
      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }
      const synonymsSetId = request.params.synonymsSetId;
      const ruleId = request.params.ruleId;
      const result = await fetchSynonymRule(asCurrentUser, synonymsSetId, ruleId);
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
      path: APIRoutes.SYNONYM_SET_ID_RULE_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:write', 'synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:write', 'synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
          ruleId: schema.string(),
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });
      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }
      const synonymsSetId = request.params.synonymsSetId;
      const ruleId = request.params.ruleId;
      const result = await deleteSynonymRule(asCurrentUser, synonymsSetId, ruleId);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: result,
      });
    })
  );

  router.put(
    {
      path: APIRoutes.SYNONYM_SET_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:write', 'synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:write', 'synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });
      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }
      const synonymsSetId = request.params.synonymsSetId;
      const result = await putSynonymsSet(asCurrentUser, synonymsSetId);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: result,
      });
    })
  );

  router.post(
    {
      path: APIRoutes.GENERATE_SYNONYM_RULE_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:write', 'synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:write', 'synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });
      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }
      const synonymsSetId = request.params.synonymsSetId;
      const result = await fetchUniqueRuleId(asCurrentUser, synonymsSetId);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: { id: result },
      });
    })
  );

  router.put(
    {
      path: APIRoutes.SYNONYM_SET_ID_RULE_ID,
      options: {
        access: 'internal',
        tags: ['synonyms:write', 'synonyms:read'],
      },
      security: {
        authz: {
          requiredPrivileges: ['synonyms:write', 'synonyms:read'],
        },
      },
      validate: {
        params: schema.object({
          synonymsSetId: schema.string(),
          ruleId: schema.string(),
        }),
        body: schema.object({
          synonyms: schema.string(),
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
      const hasSearchSynonymsPrivilege = await asCurrentUser.security.hasPrivileges({
        cluster: ['manage_search_synonyms'],
      });
      if (!hasSearchSynonymsPrivilege.has_all_requested) {
        return response.forbidden({
          body: "Your user doesn't have manage_search_synonyms privileges",
        });
      }
      const synonymsSetId = request.params.synonymsSetId;
      const ruleId = request.params.ruleId;
      const synonyms = request.body.synonyms;

      const result = await putSynonymsRule(asCurrentUser, synonymsSetId, ruleId, synonyms);
      return response.ok({
        headers: {
          'content-type': 'application/json',
        },
        body: result,
      });
    })
  );
}
