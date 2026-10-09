/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { endpointActionResponseCodes } from '../lib/endpoint_action_response_codes';
import type {
  ActionDetails,
  KillProcessActionOutputContent,
  ResponseActionParametersWithProcessData,
} from '../../../../../common/endpoint/types';
import type { KillProcessRequestBody } from '../../../../../common/api/endpoint';
import { parsedKillOrSuspendParameter } from '../lib/utils';
import { useSendKillProcessRequest } from '../../../hooks/response_actions/use_send_kill_process_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import { KillSuspendProcessActionResult } from '../../kill_process_action_result';

export const KillProcessActionResult = memo<
  ActionRequestComponentProps<{ pid?: string[]; entityId?: string[]; processName?: string[] }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendKillProcessRequest();

  const actionRequestBody = useMemo<undefined | KillProcessRequestBody>(() => {
    const { endpointId, agentType } = command.commandDefinition?.meta ?? {};
    // `kill-descendants` is a bare boolean flag; it is only ever defined for the `endpoint` agent type
    const killDescendants = command.args.hasArg('kill-descendants');
    const parameters = parsedKillOrSuspendParameter(command.args.args, killDescendants);

    return endpointId
      ? ({
          agent_type: agentType,
          endpoint_ids: [endpointId],
          comment: command.args.args?.comment?.[0],
          parameters,
        } as KillProcessRequestBody)
      : undefined;
  }, [command.args, command.commandDefinition?.meta]);

  const { result, actionDetails } = useConsoleActionSubmitter<KillProcessRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'killProcess',
  });

  if (actionDetails?.isCompleted && actionDetails.wasSuccessful) {
    return (
      <ResultComponent
        title={
          endpointActionResponseCodes[
            actionDetails?.outputs?.[actionDetails.agents[0]]?.content.code ?? ''
          ]
        }
      >
        <KillSuspendProcessActionResult
          action={
            actionDetails as ActionDetails<
              KillProcessActionOutputContent,
              ResponseActionParametersWithProcessData
            >
          }
          data-test-subj="killProcessResponseOutput"
        />
      </ResultComponent>
    );
  }

  return result;
});
KillProcessActionResult.displayName = 'KillProcessActionResult';
