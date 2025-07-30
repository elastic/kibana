/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { ExecuteActionHostResponse } from '../../endpoint_execute_action';
import { useSendRunScriptEndpoint } from '../../../hooks/response_actions/use_send_run_script_endpoint_request';
import type { RunScriptActionRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  ResponseActionRunScriptOutputContent,
  ResponseActionRunScriptParameters,
} from '../../../../../common/endpoint/types';
import type { ActionRequestComponentProps } from '../types';
export interface CrowdStrikeRunScriptActionParameters {
  Raw?: string[];
  HostPath?: string[];
  CloudFile?: string[];
  CommandLine?: string[];
  Timeout?: number[];
}

export interface MicrosoftDefenderEndpointRunScriptActionParameters {
  ScriptName: string[];
  Args?: string[];
}

export const RunScriptActionResult = memo<
  ActionRequestComponentProps<
    CrowdStrikeRunScriptActionParameters | MicrosoftDefenderEndpointRunScriptActionParameters,
    ResponseActionRunScriptOutputContent,
    ResponseActionRunScriptParameters
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendRunScriptEndpoint();
  const actionRequestBody = useMemo<undefined | RunScriptActionRequestBody>(() => {
    const { endpointId, agentType } = command.commandDefinition?.meta ?? {};

    if (!endpointId) {
      return;
    }
    // Note TC: I had much issues moving this outside of useMemo - caused by command type. If you think this is a problem - please try to move it out.
    const getParams = () => {
      const args = command.args.args;

      if (agentType === 'microsoft_defender_endpoint') {
        const msDefenderArgs = args as MicrosoftDefenderEndpointRunScriptActionParameters;

        return {
          scriptName: msDefenderArgs.ScriptName?.[0],
          args: msDefenderArgs.Args?.[0],
        };
      }

      if (agentType === 'crowdstrike') {
        const csArgs = args as CrowdStrikeRunScriptActionParameters;

        return {
          raw: csArgs.Raw?.[0],
          hostPath: csArgs.HostPath?.[0],
          cloudFile: csArgs.CloudFile?.[0],
          commandLine: csArgs.CommandLine?.[0],
          timeout: csArgs.Timeout?.[0],
        };
      }

      return {};
    };

    const parameters = getParams();
    // Early return if we have no parameters
    if (Object.keys(parameters).length === 0) {
      return;
    }

    return {
      agent_type: agentType,
      endpoint_ids: [endpointId],
      parameters,
      comment: command.args.args?.comment?.[0],
    };
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
      <ExecuteActionHostResponse
        action={completedActionDetails}
        canAccessFileDownloadLink={true}
        agentId={command.commandDefinition?.meta?.endpointId}
        textSize="s"
        data-test-subj="console"
        // Currently file is not supported for CrowdStrike
        hideFile={command.commandDefinition?.meta?.agentType === 'crowdstrike'}
        showPasscode={false}
        hideContext={true}
      />
    </ResultComponent>
  );
});
RunScriptActionResult.displayName = 'RunScriptActionResult';
