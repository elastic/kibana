/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import type { IsolationRouteRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type { ActionRequestComponentProps } from '../types';
import { useSendIsolateEndpointRequest } from '../../../hooks/response_actions/use_send_isolate_endpoint_request';

export const IsolateActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const isolateHostApi = useSendIsolateEndpointRequest();

    const actionRequestBody: IsolationRouteRequestBody | undefined = useMemo(() => {
      const { endpointId, apiReqBodyBase } = command.commandDefinition?.meta ?? {};
      const comment = command.args.args?.comment?.[0];

      return endpointId && apiReqBodyBase ? { ...apiReqBodyBase, comment } : undefined;
    }, [command.args.args?.comment, command.commandDefinition?.meta]);

    if (!actionRequestBody) {
      throw new Error('Command defintion missing `apiReqBodyBase`!!');
    }

    return useConsoleActionSubmitter({
      ResultComponent,
      setStore,
      store,
      status,
      setStatus,
      actionCreator: isolateHostApi,
      actionRequestBody,
      dataTestSubj: 'isolate',
    }).result;
  }
);
IsolateActionResult.displayName = 'IsolateActionResult';
