/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, xorWith } from 'lodash';
import type { RuleAlertType } from '../../rule_schema';
import type {
  BaseOptionalFields,
  ResponseAction,
  RuleCreateProps,
  RuleResponseAction,
  RuleUpdateProps,
} from '../../../../../common/api/detection_engine';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { stringify } from '../../../../endpoint/utils/stringify';
import { EndpointHttpError } from '../../../../endpoint/errors';
import type { EndpointScript } from '../../../../../common/endpoint/types';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../..';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';

interface ValidateRuleResponseActionsOptions {
  spaceId: string;
  ruleResponseActions: BaseOptionalFields['response_actions'];
  endpointService: EndpointAppContextService;
}

/**
 * Additional validation of rule response action definitions which do not lend themselves to being
 * included in the API schema (ex. experimental feature flag checks)
 * @param ruleResponseActions
 * @param endpointService
 * @param spaceId
 */
export const validateRuleResponseActionsPayload = async ({
  ruleResponseActions,
  endpointService,
  spaceId,
}: ValidateRuleResponseActionsOptions): Promise<void> => {
  const logger = endpointService.createLogger('ruleResponseActions');

  if (!ruleResponseActions || ruleResponseActions.length === 0) {
    return;
  }

  logger.debug(() => `Validating ${ruleResponseActions?.length ?? 0} rule response actions`);

  const isAutomatedRunScriptFeatureEnabled =
    endpointService.experimentalFeatures.responseActionsEndpointAutomatedRunScript;
  const scriptsClient = endpointService.getScriptsLibraryClient(spaceId, 'elastic');

  for (const responseAction of ruleResponseActions) {
    logger.debug(() => `Rule response action: ${stringify(responseAction)}`);

    // Validations for RunScript
    if (
      responseAction.action_type_id === ResponseActionTypesEnum['.endpoint'] &&
      responseAction.params.command === 'runscript'
    ) {
      if (!isAutomatedRunScriptFeatureEnabled) {
        throw new EndpointHttpError('Run script response action is not supported', 400);
      }

      // Validate that we have valid script IDs
      for (const [osType, { scriptId, scriptInput }] of Object.entries(
        responseAction.params?.config ?? {}
      )) {
        const msgPrefix = `Runscript [${osType}] response action:`;

        if (scriptId) {
          let script: EndpointScript;

          try {
            script = await scriptsClient.get(scriptId);
          } catch (e) {
            throw new EndpointHttpError(`${msgPrefix} ${e.message}`, 400, e);
          }

          if (!script.platform.includes(osType as SupportedHostOsType)) {
            throw new EndpointHttpError(
              `${msgPrefix} Script [${script.name}] (id: [${scriptId}]) is not compatible with [${osType}]`,
              400
            );
          }

          if (script.requiresInput && !scriptInput) {
            throw new EndpointHttpError(
              `${msgPrefix} Script [${script.name}] (id: [${scriptId}]) requires arguments to be provided`,
              400
            );
          }
        }
      }
    }
  }
};

/**
 * Used in Rule Management APIs to validate that users have Authz to Elastic Defend response actions that may
 * be included in rule definitions
 *
 * @param securitySolution
 * @param ruleUpdate
 * @param existingRule
 */
export const validateResponseActionsPermissions = async (
  securitySolution: SecuritySolutionApiRequestHandlerContext,
  ruleUpdate: RuleCreateProps | RuleUpdateProps,
  existingRule?: RuleAlertType | null
): Promise<void> => {
  if (
    !rulePayloadContainsResponseActions(ruleUpdate) ||
    (existingRule && !ruleObjectContainsResponseActions(existingRule))
  ) {
    return;
  }

  if (
    ruleUpdate.response_actions?.length === 0 &&
    existingRule?.params?.responseActions?.length === 0
  ) {
    return;
  }

  const endpointAuthz = await securitySolution.getEndpointAuthz();

  // finds elements that are not included in both arrays
  const symmetricDifference = xorWith<ResponseAction | RuleResponseAction>(
    ruleUpdate.response_actions,
    existingRule?.params?.responseActions,
    isEqual
  );

  symmetricDifference.forEach((action) => {
    if (!('command' in action?.params)) {
      return;
    }
    const authzPropName =
      RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[
        RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[action.params.command]
      ];

    const isValid = endpointAuthz[authzPropName];

    if (!isValid) {
      throw new CustomHttpRequestError(
        `User is not authorized to change ${action.params.command} response actions`,
        403
      );
    }
  });
};

function rulePayloadContainsResponseActions(rule: RuleCreateProps | RuleUpdateProps) {
  return 'response_actions' in rule;
}

function ruleObjectContainsResponseActions(rule?: RuleAlertType) {
  return rule != null && 'params' in rule && 'responseActions' in rule?.params;
}
