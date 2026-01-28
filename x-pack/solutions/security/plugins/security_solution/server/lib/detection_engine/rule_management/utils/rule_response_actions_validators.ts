/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseOptionalFields } from '../../../../../common/api/detection_engine';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { stringify } from '../../../../endpoint/utils/stringify';
import { EndpointHttpError } from '../../../../endpoint/errors';
import type { EndpointScript } from '../../../../../common/endpoint/types';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';

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
export const validateRuleResponseActions = async ({
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
