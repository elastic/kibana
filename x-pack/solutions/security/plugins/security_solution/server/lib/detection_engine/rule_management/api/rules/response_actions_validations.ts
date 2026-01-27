/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseOptionalFields } from '../../../../../../common/api/detection_engine';
import { ResponseActionTypesEnum } from '../../../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { EndpointHttpError } from '../../../../../endpoint/errors';

interface ValidateRuleResponseActionsOptions {
  ruleResponseActions: BaseOptionalFields['response_actions'];
  endpointService: EndpointAppContextService;
}

/**
 * Additional validation of rule response action definitions which do not lend themselves to being
 * included in the API schema (ex. experimental feature flag checks)
 * @param ruleResponseActions
 * @param endpointService
 */
export const validateRuleResponseActions = async ({
  ruleResponseActions,
  endpointService,
}: ValidateRuleResponseActionsOptions): Promise<EndpointHttpError | void> => {
  // Make sure runscript automated response action feature flag is enabled
  if (ruleResponseActions) {
    const isAutomatedRunScriptFeatureEnabled =
      endpointService.experimentalFeatures.responseActionsEndpointAutomatedRunScript;

    if (isAutomatedRunScriptFeatureEnabled) {
      for (const responseAction of ruleResponseActions) {
        if (
          responseAction.action_type_id === ResponseActionTypesEnum['.endpoint'] &&
          responseAction.params.command === 'runscript' &&
          !isAutomatedRunScriptFeatureEnabled
        ) {
          return new EndpointHttpError('Run script response action is not supported', 400);
        }
      }
    }
  }
};
