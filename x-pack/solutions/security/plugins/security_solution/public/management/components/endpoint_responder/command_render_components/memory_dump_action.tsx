/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { MemoryDumpResponseActionOutputResult } from '../../memory_dump_response_action_output_result';
import { useSendMemoryDumpRequest } from '../../../hooks/response_actions/use_send_memory_dump_request';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { MemoryDumpActionRequestBody } from '../../../../../common/api/endpoint/actions/response_actions/memory_dump';
import type { SupportedArguments } from '../../console';
import type { ActionRequestComponentProps } from '../types';
import type {
  ResponseActionMemoryDumpOutputContent,
  ResponseActionMemoryDumpParameters,
} from '../../../../../common/endpoint/types';

export interface MemoryDumpActionConsoleArguments extends SupportedArguments {
  type: 'kernel' | 'process';
  pid: number;
  entityId: string;
}

export const MemoryDumpActionResult = memo<
  ActionRequestComponentProps<
    MemoryDumpActionConsoleArguments,
    ResponseActionMemoryDumpOutputContent,
    ResponseActionMemoryDumpParameters
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendMemoryDumpRequest();

  const actionRequestBody = useMemo<undefined | MemoryDumpActionRequestBody>(() => {
    const { agentType, endpointId } = command.commandDefinition?.meta ?? {};
    const { comment, type, pid, entityId } = command.args.args;

    if (!endpointId) {
      return;
    }

    const reqBody: MemoryDumpActionRequestBody = {
      agent_type: agentType,
      endpoint_ids: [endpointId],
      ...(comment?.[0] ? { comment: comment?.[0] } : {}),
      parameters: {
        type: type[0],
        ...(pid ? { pid: pid[0] } : {}),
        ...(entityId ? { entity_id: entityId[0] } : {}),
      },
    };

    return reqBody;
  }, [command.args.args, command.commandDefinition?.meta]);

  const { result, actionDetails } = useConsoleActionSubmitter<
    MemoryDumpActionRequestBody,
    ResponseActionMemoryDumpOutputContent,
    ResponseActionMemoryDumpParameters
  >({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'memoryDump',
  });

  if (actionDetails?.isCompleted && actionDetails.wasSuccessful) {
    return (
      <ResultComponent>
        <MemoryDumpResponseActionOutputResult action={actionDetails} />
      </ResultComponent>
    );
  }

  return result;
});
MemoryDumpActionResult.displayName = 'MemoryDumpActionResult';
