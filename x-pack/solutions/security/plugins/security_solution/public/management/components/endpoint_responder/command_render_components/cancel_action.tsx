/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { useSendCancelRequest } from '../../../hooks/response_actions/use_send_cancel_request';
import type { CancelActionRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';

export const CancelActionResult = memo<
  ActionRequestComponentProps<{
    action: string[];
    force?: boolean[];
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendCancelRequest();
  const endpointId = command.commandDefinition?.meta?.endpointId;

  const actionRequestBody = useMemo<undefined | CancelActionRequestBody>(() => {
    const { action, comment, force } = command.args.args;
    const agentType = command.commandDefinition?.meta?.agentType;

    return endpointId
      ? {
          agent_type: agentType,
          endpoint_ids: [endpointId],
          comment: comment?.[0],
          parameters: {
            id: action[0],
            force: force?.[0],
          },
        }
      : undefined;
  }, [command.args.args, command.commandDefinition?.meta?.agentType, endpointId]);

  return useConsoleActionSubmitter<CancelActionRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'cancel',
  }).result;
});

CancelActionResult.displayName = 'CancelActionResult';
