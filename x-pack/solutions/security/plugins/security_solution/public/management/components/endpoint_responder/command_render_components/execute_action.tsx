/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ExecuteActionRequestBody } from '../../../../../common/api/endpoint';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
} from '../../../../../common/endpoint/types';
import { useSendExecuteEndpoint } from '../../../hooks/response_actions/use_send_execute_endpoint_request';
import type { ActionRequestComponentProps } from '../types';
import { parsedExecuteTimeout } from '../lib/utils';
import { ExecuteActionHostResponse } from '../../endpoint_execute_action';

export const ExecuteActionResult = memo<
  ActionRequestComponentProps<
    {
      command: string;
      timeout?: string;
    },
    ResponseActionExecuteOutputContent,
    ResponseActionsExecuteParameters
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendExecuteEndpoint();
  const actionRequestBody = useMemo<undefined | ExecuteActionRequestBody>(() => {
    const { endpointId, agentType } = command.commandDefinition?.meta ?? {};

    if (!endpointId) {
      return;
    }
    return {
      agent_type: agentType,
      endpoint_ids: [endpointId],
      parameters: {
        command: command.args.args.command[0],
        timeout: parsedExecuteTimeout(command.args.args.timeout?.[0]),
      },
      comment: command.args.args?.comment?.[0],
    };
  }, [
    command.commandDefinition?.meta,
    command.args.args.command,
    command.args.args.timeout,
    command.args.args?.comment,
  ]);

  const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter<
    ExecuteActionRequestBody,
    ResponseActionExecuteOutputContent,
    ResponseActionsExecuteParameters
  >({
    ResultComponent,
    setStore,
    store,
    status,
    setStatus,
    actionCreator,
    actionRequestBody,
    dataTestSubj: 'execute',
  });

  if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
    return result;
  }

  // Show results
  return (
    <ResultComponent
      data-test-subj="executeSuccess"
      showAs="success"
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.executeAction.successTitle',
        { defaultMessage: 'Command execution was successful.' }
      )}
    >
      <ExecuteActionHostResponse
        action={completedActionDetails}
        canAccessFileDownloadLink={true}
        agentId={command.commandDefinition?.meta?.endpointId}
        textSize="s"
        data-test-subj="console"
      />
    </ResultComponent>
  );
});
ExecuteActionResult.displayName = 'ExecuteActionResult';

const ABOUT_ESCAPE_DASHES = i18n.translate(
  'xpack.securitySolution.endpointConsoleCommands.execute.args.command.aboutConsecutiveDashes',
  {
    defaultMessage: 'Multiple consecutive dashes in the value provided must be escaped. Ex:',
  }
);

const ABOUT_ESCAPE_QUOTES = i18n.translate(
  'xpack.securitySolution.endpointConsoleCommands.execute.args.command.aboutQuotes',
  {
    defaultMessage: 'Quotes provided in the value can be used without escaping. Ex:',
  }
);

export const getExecuteCommandArgAboutInfo = (): React.ReactNode => {
  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.endpointConsoleCommands.execute.args.command.about"
        defaultMessage="The command to execute."
      />
      <br />
      {`${ABOUT_ESCAPE_DASHES} execute --command "/opt/directory\\-\\-\\-directory/myBinary \\-\\-version"`}
      <br />
      {`${ABOUT_ESCAPE_QUOTES} execute --command "cd "C:\\Program Files\\directory""`}
    </>
  );
};
