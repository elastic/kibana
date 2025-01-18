/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ScanActionRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';
import { useSendScanRequest } from '../../../hooks/response_actions/use_send_scan_request';

export const ScanActionResult = memo<
  ActionRequestComponentProps<{
    path: string[];
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendScanRequest();

  const actionRequestBody = useMemo<undefined | ScanActionRequestBody>(() => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const { path, comment } = command.args.args;
    const agentType = command.commandDefinition?.meta?.agentType;

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
  }, [
    command.args.args,
    command.commandDefinition?.meta?.agentType,
    command.commandDefinition?.meta?.endpointId,
  ]);

  return useConsoleActionSubmitter<ScanActionRequestBody>({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'scan',
    pendingMessage: i18n.translate('xpack.securitySolution.scanAction.pendingMessage', {
      defaultMessage: 'File path scan is in progress.',
    }),
  }).result;
});

ScanActionResult.displayName = 'ScanActionResult';
