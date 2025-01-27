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

export const RunScriptActionResult = memo<
  ActionRequestComponentProps<
    {
      Raw?: string;
      HostPath?: string;
      CloudFile?: string;
      CommandLine?: string;
      Timeout?: number;
      comment?: string;
    },
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
    return {
      agent_type: agentType,
      endpoint_ids: [endpointId],
      parameters: {
        raw: command.args.args.Raw?.[0],
        hostPath: command.args.args.HostPath?.[0],
        cloudFile: command.args.args.CloudFile?.[0],
        commandLine: command.args.args.CommandLine?.[0],
        timeout: command.args.args.Timeout?.[0],
      },
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
        hideFile={true}
        hideContext={true}
      />
    </ResultComponent>
  );
});
RunScriptActionResult.displayName = 'RunScriptActionResult';
