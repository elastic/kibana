/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type {
  ExceptionListPreDeleteListBlocker,
  ExceptionsListPreDeleteListServerExtension,
} from '@kbn/lists-plugin/server';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { EndpointError } from '../../../../common/endpoint/errors';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';

// Endpoint artifact lists (trusted apps, blocklists, etc.) are pushed to endpoints via
// policy and are never referenced by detection rules, so they skip the rule reference
// check. The plain `endpoint` type is deliberately NOT in this set -- the Elastic
// Endpoint exceptions list CAN be attached to detection rules, so it must go through
// the reference check like any other detection list.
const ENDPOINT_ARTIFACT_EXCEPTION_LIST_TYPES: ReadonlySet<ExceptionListSchema['type']> = new Set([
  'endpoint_trusted_apps',
  'endpoint_trusted_devices',
  'endpoint_events',
  'endpoint_host_isolation_exceptions',
  'endpoint_blocklists',
  'endpoint_custom_yara_signatures',
]);

const MAX_REFERENCING_RULES = 10000;

export const getExceptionsPreDeleteListHandler = (
  endpointAppContextService: EndpointAppContextService
): ExceptionsListPreDeleteListServerExtension['callback'] => {
  return async function ({ data, context: { request } }) {
    if (ENDPOINT_ARTIFACT_EXCEPTION_LIST_TYPES.has(data.list.type)) {
      return data;
    }

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
