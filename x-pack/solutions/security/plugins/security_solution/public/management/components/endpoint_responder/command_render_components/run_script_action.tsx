/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { parsedExecuteTimeout } from '../lib/utils';
import type { ParsedCommandInput } from '../../console/service/types';
import { RunscriptActionResult } from '../../runscript_action_result';
import type { ArgSelectorState, SupportedArguments } from '../../console';
import { useSendRunScriptEndpoint } from '../../../hooks/response_actions/use_send_run_script_endpoint_request';
import type {
  EndpointRunScriptActionRequestParams,
  RunScriptActionRequestBody,
} from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  ResponseActionRunScriptOutputContent,
  ResponseActionRunScriptParameters,
} from '../../../../../common/endpoint/types';
import type { ActionRequestComponentProps } from '../types';
import type { CustomScriptSelectorState } from '../../console_argument_selectors/custom_scripts_selector/custom_script_selector';

export interface CrowdStrikeRunScriptActionParameters extends SupportedArguments {
  Raw: string;
  HostPath: string;
  CloudFile: string;
  CommandLine: string;
  Timeout: string;
}

export interface MicrosoftDefenderEndpointRunScriptActionParameters extends SupportedArguments {
  ScriptName: string;
  Args: string;
}

export interface SentinelOneRunScriptActionParameters extends SupportedArguments {
  script: string;
  inputParams: string;
}

export interface EndpointRunScriptActionParameters extends SupportedArguments {
  script: string;
  inputParams: string;
  timeout: string;
}

export const RunScriptActionResult = memo<
  ActionRequestComponentProps<
    | CrowdStrikeRunScriptActionParameters
    | MicrosoftDefenderEndpointRunScriptActionParameters
    | SentinelOneRunScriptActionParameters
    | EndpointRunScriptActionParameters,
    ResponseActionRunScriptOutputContent,
    ResponseActionRunScriptParameters
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendRunScriptEndpoint();
  const actionRequestBody = useMemo<undefined | RunScriptActionRequestBody>(() => {
    const { endpointId, agentType } = command.commandDefinition?.meta ?? {};

    if (!endpointId) {
      return {} as unknown as RunScriptActionRequestBody;
    }

    // Note TC: I had much issues moving this outside of useMemo - caused by command type. If you think this is a problem - please try to move it out.
    const getParams = () => {
      const args = command.args.args;

      if (agentType === 'microsoft_defender_endpoint') {
        const msDefenderArgs =
          args as ParsedCommandInput<MicrosoftDefenderEndpointRunScriptActionParameters>['args'];

        return {
          scriptName: msDefenderArgs.ScriptName?.[0],
          args: msDefenderArgs.Args?.[0],
        };
      }

      if (agentType === 'crowdstrike') {
        const csArgs = args as ParsedCommandInput<CrowdStrikeRunScriptActionParameters>['args'];

        return {
          raw: csArgs.Raw?.[0],
          hostPath: csArgs.HostPath?.[0],
          cloudFile: csArgs.CloudFile?.[0],
          commandLine: csArgs.CommandLine?.[0],
          timeout: csArgs.Timeout?.[0],
        };
      }

      if (agentType === 'sentinel_one' || agentType === 'endpoint') {
        const { inputParams, timeout } = args as ParsedCommandInput<
          SentinelOneRunScriptActionParameters | EndpointRunScriptActionParameters
        >['args'];
        const scriptSelectionState: ArgSelectorState<CustomScriptSelectorState>[] | undefined =
          command.argState?.script;

        if (scriptSelectionState && scriptSelectionState?.[0].store?.selectedOption?.id) {
          const params: RunScriptActionRequestBody['parameters'] = {
            scriptId: scriptSelectionState[0].store.selectedOption.id,
            scriptInput: inputParams?.[0],
          };

          if (agentType === 'endpoint') {
            const timeoutInSeconds = parsedExecuteTimeout(timeout?.[0] as string);

            if (timeoutInSeconds) {
              (
                params as RunScriptActionRequestBody<EndpointRunScriptActionRequestParams>['parameters']
              ).timeout = timeoutInSeconds;
            }
          }

          return params;
        }
      }

      return {} as unknown as RunScriptActionRequestBody;
    };

    return {
      agent_type: agentType,
      endpoint_ids: [endpointId],
      parameters: getParams(),
      comment: command.args.args?.comment?.[0],
    } as unknown as RunScriptActionRequestBody;
  }, [command]);

  const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter<
    RunScriptActionRequestBody,
    ResponseActionRunScriptOutputContent,
    ResponseActionRunScriptParameters
  >({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'runscript',
  });

  if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
    return result;
  }

  return (
    <ResultComponent
      data-test-subj="executeSuccess"
      showAs="success"
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.runScriptAction.successTitle',
        { defaultMessage: 'RunScript was successful.' }
      )}
    >
      <RunscriptActionResult
        action={completedActionDetails}
        data-test-subj="runscriptResult"
        textSize="s"
      />
    </ResultComponent>
  );
});
RunScriptActionResult.displayName = 'RunScriptActionResult';
