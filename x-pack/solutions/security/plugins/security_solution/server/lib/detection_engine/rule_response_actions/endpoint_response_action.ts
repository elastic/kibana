/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';
import { EndpointError } from '../../../../common/endpoint/errors';
import { stringify } from '../../../endpoint/utils/stringify';
import type {
  RuleResponseEndpointAction,
  ProcessesParams,
} from '../../../../common/api/detection_engine';
import {
  getErrorProcessAlerts,
  getIsolateAlerts,
  getProcessAlerts,
  getResponseActionDataFromAlert,
} from './utils';
import type { AlertsAction, ResponseActionAlerts } from './types';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type {
  AutomatedRunScriptConfig,
  ResponseActionParametersWithEntityId,
  ResponseActionParametersWithPid,
} from '../../../../common/endpoint/types';

export const endpointResponseAction = async (
  responseAction: RuleResponseEndpointAction,
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
): Promise<void> => {
  const logger = endpointAppContextService.createLogger(
    'ruleExecution',
    'automatedResponseActions'
  );
  const ruleId = alerts[0].kibana.alert?.rule.uuid;
  const ruleName = alerts[0].kibana.alert?.rule.name;
  const errors: string[] = [];
  const spaceId = (alerts[0].kibana.space_ids ?? [])[0];

  if (!spaceId) {
    logger.error(
      new EndpointError(
        `Unable to identify the space ID from alert data ('kibana.space_ids') for rule [${ruleName}][${ruleId}]`
      )
    );
    return;
  }

  const logMsgPrefix = `Rule [${ruleName}][${ruleId}][${spaceId}]:`;
  const { comment, command } = responseAction.params;
  const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
    agentType: 'endpoint',
    username: 'unknown',
    spaceId,
  });

  logger.debug(() => `Processing automated response action: ${stringify(responseAction)}`);

  const processResponseActionClientError = (err: Error, endpointIds: string[]): Promise<void> => {
    errors.push(
      `attempt to [${command}] host IDs [${endpointIds.join(', ')}] returned error: ${err.message}`
    );

    return Promise.resolve();
  };

  const response: Array<Promise<unknown>> = [];

  switch (command) {
    case 'isolate':
      response.push(
        Promise.all(
          Object.values(getIsolateAlerts(alerts)).map(
            ({ endpoint_ids, alert_ids, parameters, error, hosts }: AlertsAction) => {
              logger.info(
                `${logMsgPrefix} [${command}] [${endpoint_ids.length}] agent(s): ${stringify(
                  endpoint_ids
                )}`
              );

              return responseActionsClient
                .isolate(
                  {
                    endpoint_ids,
                    alert_ids,
                    parameters,
                    comment,
                  },
                  {
                    hosts,
                    ruleName,
                    ruleId,
                    error,
                  }
                )
                .catch((err) => {
                  return processResponseActionClientError(err, endpoint_ids);
                });
            }
          )
        )
      );

      break;

    case 'suspend-process':
    case 'kill-process':
      const processesActionRuleConfig: ProcessesParams['config'] = (
        responseAction.params as ProcessesParams
      ).config;

      const createProcessActionFromAlerts = (
        actionAlerts: Record<string, Record<string, AlertsAction>>
      ) => {
        return each(actionAlerts, (actionPerAgent) => {
          return each(
            actionPerAgent,
            ({ endpoint_ids, alert_ids, parameters, error, hosts }: AlertsAction) => {
              logger.info(
                `${logMsgPrefix} [${command}] [${endpoint_ids.length}] agent(s): ${stringify(
                  endpoint_ids
                )}`
              );

              return responseActionsClient[
                command === 'kill-process' ? 'killProcess' : 'suspendProcess'
              ](
                {
                  comment,
                  endpoint_ids,
                  alert_ids,
                  parameters: parameters as
                    | ResponseActionParametersWithPid
                    | ResponseActionParametersWithEntityId,
                },
                {
                  hosts,
                  ruleId,
                  ruleName,
                  error,
                }
              ).catch((err) => {
                return processResponseActionClientError(err, endpoint_ids);
              });
            }
          );
        });
      };

      const foundFields = getProcessAlerts(alerts, processesActionRuleConfig);
      const notFoundField = getErrorProcessAlerts(alerts, processesActionRuleConfig);
      const processActions = createProcessActionFromAlerts(foundFields);
      const processActionsWithError = createProcessActionFromAlerts(notFoundField);

      response.push(Promise.all([processActions, processActionsWithError]));

      break;

    case 'runscript':
      {
        const processedAgentIds = new Set<string>();

        for (const alert of alerts) {
          const alertData = getResponseActionDataFromAlert(alert);

          logger.debug(
            () => `${logMsgPrefix}: Alert data for use with runscript: ${stringify(alertData)}`
          );

          if (
            alertData.agentId &&
            alertData.hostOsType &&
            !processedAgentIds.has(alertData.agentId)
          ) {
            processedAgentIds.add(alert.agent.id);
            const ruleScriptConfig = (
              responseAction.params.config as AutomatedRunScriptConfig | undefined
            )?.[alertData.hostOsType];

            logger.debug(
              () =>
                `${logMsgPrefix}: Rule runscript configuration for OS type [${
                  alertData.hostOsType
                }]: ${stringify(ruleScriptConfig)}`
            );

            if (ruleScriptConfig && ruleScriptConfig.scriptId) {
              response.push(
                responseActionsClient.runscript(
                  {
                    endpoint_ids: [alertData.agentId],
                    alert_ids: [alertData.alertId],
                    comment: responseAction.params.comment,
                    parameters: {
                      scriptId: ruleScriptConfig.scriptId,
                      scriptInput: ruleScriptConfig.scriptInput,
                      timeout: ruleScriptConfig.timeout,
                    },
                  },
                  {
                    hosts: { [alertData.agentId]: { name: alertData.hostName } },
                    ruleId: alertData.ruleId,
                    ruleName: alertData.ruleName,
                    // FIXME:PT handle local errors
                    // error,
                  }
                )
              );
            }
            // FIXME:PT should  we log anything if the user did not define a script for this OS type?
          }

          // FIXME:PT should we still create a response action wtih error if we cant determine osType from alert?
        }
      }
      break;

    default:
      errors.push(`response action [${command}] is not supported`);
  }

  return Promise.all(response)
    .then(() => {})
    .finally(() => {
      if (errors.length !== 0) {
        logger.error(
          `${logMsgPrefix} The following [${errors.length}] errors were encountered:\n${errors.join(
            '\n'
          )}`
        );
      }
    });
};
