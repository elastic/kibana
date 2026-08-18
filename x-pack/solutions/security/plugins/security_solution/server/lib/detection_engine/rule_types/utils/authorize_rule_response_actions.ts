/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { RuleTypeParamsAuthorizer } from '@kbn/alerting-plugin/server';
import { transformAlertToRuleResponseAction } from '../../../../../common/detection_engine/transform_actions';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import type { CheckOsqueryResponseActionAuthz } from '../../../../endpoint/services/actions/utils/rule_response_actions_validators';
import { validateRuleResponseActions } from '../../../../endpoint/services';
import type { RuleAlertType, RuleParams } from '../../rule_schema';

interface CreateResponseActionsParamsAuthorizerDeps {
  endpointAppContextService: EndpointAppContextService;
  /**
   * Returns a request-scoped osquery response action authorization checker.
   * Optional because osquery is not guaranteed to be available; when omitted,
   * osquery response actions are not authorized here (matching the behavior of
   * {@link validateRuleResponseActions} when no checker is provided).
   */
  getOsqueryResponseActionsAuthzChecker?: (
    request: KibanaRequest
  ) => CheckOsqueryResponseActionAuthz;
}

/**
 * Builds the alerting {@link RuleTypeParamsAuthorizer} for security rule types.
 *
 * The Detection Engine's own rule CRUD routes authorize Elastic Defend / osquery
 * response actions via {@link validateRuleResponseActions}. Writes performed
 * through the generic Alerting APIs bypass those routes, so this authorizer runs
 * the same validation from within the Alerting framework's rule write paths,
 * against the acting user's privileges.
 */
export const createResponseActionsParamsAuthorizer = <TParams extends RuleParams>({
  endpointAppContextService,
  getOsqueryResponseActionsAuthzChecker,
}: CreateResponseActionsParamsAuthorizerDeps): RuleTypeParamsAuthorizer<TParams> => ({
  authorize: async (params, { request, previousParams }) => {
    const responseActions = params.responseActions?.map(transformAlertToRuleResponseAction);

    try {
      await validateRuleResponseActions({
        endpointService: endpointAppContextService,
        endpointAuthz: await endpointAppContextService.getEndpointAuthz(request),
        spaceId: endpointAppContextService.getActiveSpaceId(request),
        rulePayload: { response_actions: responseActions },
        // `validateRuleResponseActions` only reads `existingRule.params.responseActions`,
        // so a minimal object is sufficient here.
        existingRule: previousParams
          ? ({ params: previousParams } as unknown as RuleAlertType)
          : null,
        checkOsqueryResponseActionAuthz: getOsqueryResponseActionsAuthzChecker?.(request),
      });
    } catch (err) {
      // Preserve the HTTP status code (403 for authz failures, 400 for invalid
      // payloads) as a Boom error so the generic Alerting APIs surface it
      // correctly. Route-driven paths already translate both error shapes.
      if (Boom.isBoom(err)) {
        throw err;
      }
      // Both the Endpoint and osquery validators throw `CustomHttpRequestError`,
      // but from different plugin-local classes, so duck-type on `statusCode`
      // rather than `instanceof` to preserve 403 (authz) vs 400 (invalid payload).
      const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 400;
      throw new Boom.Boom(err.message, { statusCode });
    }
  },
});
