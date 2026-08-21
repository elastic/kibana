/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type {
  ExceptionListPreDeleteListBlocker,
  ExceptionsListPreDeleteListServerExtension,
} from '@kbn/lists-plugin/server';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { EndpointError } from '../../../../common/endpoint/errors';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';

const MAX_REFERENCING_RULES = 10000;

// Every list type goes through the rule reference check, including endpoint artifact
// lists (trusted apps, blocklists, etc.). Artifact lists are never referenced by
// detection rules, so the check is a no-op for them; exempting them would require a
// caller-forgeable discriminator and would make the endpoint's behavior non-uniform.
export const getExceptionsPreDeleteListHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreDeleteListServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    // Fail closed: without a request there is no way to check whether detection rules
    // reference this list, and treating "cannot verify" as "not referenced" would allow
    // deleting a list that rules still depend on.
    if (!request) {
      throw new EndpointError(
        `Unable to verify detection rule references for exception list [${data.list.list_id}]: no request in context`
      );
    }

    const rulesClient = await endpointAppContextService.getRulesClient(request);
    const { data: referencingRules } = await findRules({
      rulesClient,
      perPage: MAX_REFERENCING_RULES,
      hasReference: {
        id: data.list.id,
        type: getSavedObjectType({ namespaceType: data.namespaceType }),
      },
      filter: undefined,
      fields: undefined,
      sortField: undefined,
      sortOrder: undefined,
      page: undefined,
    });

    if (referencingRules.length === 0) {
      return data;
    }

    const blockers: ExceptionListPreDeleteListBlocker[] = referencingRules.map(
      ({ id, name, params }) => ({
        id,
        name,
        rule_id: params.ruleId,
      })
    );

    return {
      ...data,
      blockedBy: [...data.blockedBy, ...blockers],
    };
  };
};
