/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, xorWith } from 'lodash';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';
import type { RuleAlertType } from '../../../../lib/detection_engine/rule_schema';
import type {
  BaseOptionalFields,
  ResponseAction,
  RuleResponseAction,
} from '../../../../../common/api/detection_engine';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { stringify } from '../../../utils/stringify';
import { EndpointHttpError } from '../../../errors';
import type { EndpointScript } from '../../../../../common/endpoint/types';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
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
  const logger = endpointService.createLogger('validateRuleResponseActionsPayload');

  if (!ruleResponseActions || ruleResponseActions.length === 0) {
    return;
  }

  logger.debug(() => `Validating ${ruleResponseActions?.length ?? 0} rule response actions`);

  const isAutomatedRunScriptFeatureEnabled =
    endpointService.experimentalFeatures.responseActionsEndpointAutomatedRunScript;
  const scriptsClient = endpointService.getScriptsLibraryClient(spaceId, 'elastic');

  for (const responseAction of ruleResponseActions) {
    logger.debug(() => `Rule response action: ${stringify(responseAction)}`);

    // -----------------------------------------------
    // Validations for RunScript
    // -----------------------------------------------
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

interface ValidateRuleResponseActionsPermissionsOptions<
  T extends Pick<BaseOptionalFields, 'response_actions'>
> {
  endpointAuthz: EndpointAuthz;
  endpointService: EndpointAppContextService;
  ruleUpdate: T;
  /** Existing rule SHOULD ALWAYS be provided for flows that update rules */
  existingRule?: RuleAlertType | null;
}

/**
 * Used in Rule Management APIs to validate that users have Authz to Elastic Defend response actions that may
 * be included in rule definitions
 */
export const validateRuleResponseActionsPermissions = async <
  T extends Pick<BaseOptionalFields, 'response_actions'>
>({
  endpointService,
  endpointAuthz,
  ruleUpdate,
  existingRule,
}: ValidateRuleResponseActionsPermissionsOptions<T>): Promise<void> => {
  const logger = endpointService.createLogger('validateRuleResponseActionsPermissions');

  logger.debug(
    () => `Validating response actions permissions for rule payload: ${stringify(ruleUpdate)}`
  );

  if (!rulePayloadContainsResponseActions(ruleUpdate)) {
    logger.debug(() => `Nothing to do - no response action in payload`);
    return;
  }

  // finds elements that are not included in both arrays
  const symmetricDifference = xorWith<ResponseAction | RuleResponseAction>(
    ruleUpdate.response_actions,
    existingRule?.params?.responseActions,
    isEqual
  );

  logger.debug(
    () => `Validating authz the following rule response actions: ${stringify(symmetricDifference)}`
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

function rulePayloadContainsResponseActions<T extends Pick<BaseOptionalFields, 'response_actions'>>(
  rule: T
): boolean {
  return Boolean(rule && rule?.response_actions && rule.response_actions.length > 0);
}
