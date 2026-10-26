/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { useSendGetFileRequest } from '../../../hooks/response_actions/use_send_get_file_request';
import type { ResponseActionGetFileRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';

export const GetFileActionResult = memo<
  ActionRequestComponentProps<{
    path: string[];
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendGetFileRequest();

  const actionRequestBody = useMemo<undefined | ResponseActionGetFileRequestBody>(() => {
    const { agentType, endpointId } = command.commandDefinition?.meta ?? {};
    const { path, comment } = command.args.args;

    return endpointId
      ? {
          agent_type: agentType,
          endpoint_ids: [endpointId],
          comment: comment?.[0],
          parameters: {
            path: path[0],
          },
        }
      : undefined;
  }, [command.args.args, command.commandDefinition?.meta]);

  return useConsoleActionSubmitter<ResponseActionGetFileRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'getFile',
  }).result;
});
GetFileActionResult.displayName = 'GetFileActionResult';
