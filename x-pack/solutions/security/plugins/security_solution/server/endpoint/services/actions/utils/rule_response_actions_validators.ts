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
  EndpointResponseAction,
  OsqueryResponseAction,
  ProcessesParams,
  ResponseAction,
  RuleResponseAction,
  RuleResponseEndpointAction,
  RuleResponseOsqueryAction,
} from '../../../../../common/api/detection_engine';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { stringify } from '../../../utils/stringify';
import type { EnabledAutomatedResponseActionsCommands } from '../../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';

type RuleResponseActions = Pick<BaseOptionalFields, 'response_actions'>;

interface ValidateRuleResponseActionsOptions<T extends RuleResponseActions = RuleResponseActions> {
  /**
   * Endpoint Authz can be retrieve via Route context or `endpointService.getEndpointAuthz(httpRequest)`
   */
  endpointAuthz: EndpointAuthz;
  endpointService: EndpointAppContextService;
  rulePayload: T;
  spaceId: string;
  /**
   * Updates to existing rule SHOULD ALWAYS pass this value in so that validations
   * are only applied to the response actions that have changed
   */
  existingRule?: RuleAlertType | null;
}

/**
 * Used in Rule Management APIs to validate that users have Authz to Elastic Defend response actions that may
 * be included in rule definitions as well as validate that the response actions payload data is valid.
 */
export const validateRuleResponseActions = async <
  T extends RuleResponseActions = RuleResponseActions
>({
  endpointService,
  endpointAuthz,
  spaceId,
  rulePayload: { response_actions: ruleResponseActions },
  existingRule,
}: ValidateRuleResponseActionsOptions<T>): Promise<void> => {
  const logger = endpointService.createLogger('validateRuleResponseActions');
  const existingRuleResponseActions = existingRule?.params?.responseActions;

  logger.debug(
    () =>
      `Validating rule response actions in space [${spaceId}]:\nrule payload: ${stringify(
        ruleResponseActions
      )}\nexisting rule response actions: ${stringify(existingRuleResponseActions)}\n`
  );

  if (
    (!ruleResponseActions || ruleResponseActions.length === 0) &&
    (!existingRuleResponseActions || existingRuleResponseActions.length === 0)
  ) {
    logger.debug(() => `Nothing to do - no response actions in payload or existing rule`);
  }

  const responseActionsToValidate = xorWith<ResponseAction | RuleResponseAction>(
    ruleResponseActions,
    existingRuleResponseActions,
    isEqual
  );

  if (responseActionsToValidate.length === 0) {
    logger.debug(() => `Nothing to do - no changes were made to response actions`);
    return;
  }

  logger.debug(
    () => `Response actions needing validation: ${stringify(responseActionsToValidate)}`
  );

  for (const actionData of responseActionsToValidate) {
    if (!isEndpointResponseAction(actionData)) {
      logger.debug(
        () =>
          `Skipping validation for response action - not an action type id not '.endpoint': ${stringify(
            actionData
          )}`
      );
      return;
    }

    validateEndpointResponseActionAuthz(endpointAuthz, actionData.params.command);

    // Individual response action payload validations
    switch (actionData.params.command) {
      case 'kill-process':
      case 'suspend-process':
        validateEndpointKillSuspendProcessResponseAction(actionData.params);
        break;
    }
  }

  logger.debug(() => `All response actions validated successfully`);
};

/** @private */
const validateEndpointResponseActionAuthz = (
  endpointAuthz: EndpointAuthz,
  command: EnabledAutomatedResponseActionsCommands
) => {
  const authzPropName =
    RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[
      RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command]
    ];

  if (!endpointAuthz[authzPropName]) {
    throw new CustomHttpRequestError(
      `User is not authorized to change ${command} response action`,
      403
    );
  }
};

/**
 * Type guard that checks if the response action is an EDR response action
 * @param ruleResponseAction
 *
 * @private
 */
const isEndpointResponseAction = (
  ruleResponseAction:
    | RuleResponseOsqueryAction
    | RuleResponseEndpointAction
    | OsqueryResponseAction
    | EndpointResponseAction
): ruleResponseAction is EndpointResponseAction | RuleResponseEndpointAction => {
  return (
    ('action_type_id' in ruleResponseAction &&
      ruleResponseAction.action_type_id === ResponseActionTypesEnum['.endpoint']) ||
    ('actionTypeId' in ruleResponseAction &&
      ruleResponseAction.actionTypeId === ResponseActionTypesEnum['.endpoint'])
  );
};

/** @private */
const validateEndpointKillSuspendProcessResponseAction = ({ config, command }: ProcessesParams) => {
  if (config.overwrite && config.field) {
    throw new CustomHttpRequestError(
      `Invalid [${command}] response action configuration: field is not allowed when overwrite is true`,
      400
    );
  }

  if (!config.overwrite && !config.field.trim()) {
    throw new CustomHttpRequestError(
      `Invalid [${command}] response action configuration: field is required when overwrite is false`,
      400
    );
  }
};
