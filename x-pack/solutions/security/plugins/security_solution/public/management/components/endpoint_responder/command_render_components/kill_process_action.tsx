/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import type { KillProcessRequestBody } from '../../../../../common/api/endpoint';
import { parsedKillOrSuspendParameter } from '../lib/utils';
import { useSendKillProcessRequest } from '../../../hooks/response_actions/use_send_kill_process_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';

export const KillProcessActionResult = memo<
  ActionRequestComponentProps<{ pid?: string[]; entityId?: string[]; processName?: string[] }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendKillProcessRequest();

  const actionRequestBody = useMemo<undefined | KillProcessRequestBody>(() => {
    const { apiReqBodyBase } = command.commandDefinition?.meta ?? {};
    const parameters = parsedKillOrSuspendParameter(command.args.args);

    return apiReqBodyBase
      ? {
          ...apiReqBodyBase,
          comment: command.args.args?.comment?.[0],
          parameters,
        }
      : undefined;
  }, [command.args.args, command.commandDefinition?.meta]);

  if (!actionRequestBody) {
    throw new Error('Command definition missing `apiReqBodyBase`!!');
  }

  return useConsoleActionSubmitter<KillProcessRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'killProcess',
  }).result;
});
KillProcessActionResult.displayName = 'KillProcessActionResult';
