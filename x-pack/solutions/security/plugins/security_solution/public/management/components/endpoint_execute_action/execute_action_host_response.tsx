/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiSpacer, type EuiTextProps } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { EndpointHostExecutionResponseOutput } from '../endpoint_host_execution_response_output/endpoint_host_execution_response_output';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionExecuteOutputContent,
  ResponseActionRunScriptOutputContent,
  ResponseActionRunScriptParameters,
  ResponseActionsExecuteParameters,
} from '../../../../common/endpoint/types';
import { EXECUTE_FILE_LINK_TITLE } from '../endpoint_response_actions_list/translations';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';

export interface ExecuteActionHostResponseProps {
  action: MaybeImmutable<
    | ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>
    | ActionDetails<ResponseActionRunScriptOutputContent, ResponseActionRunScriptParameters>
  >;
  agentId?: string;
  canAccessFileDownloadLink: boolean;
  'data-test-subj'?: string;
  textSize?: Exclude<EuiTextProps['size'], 'm' | 'relative'>;
}

export const ExecuteActionHostResponse = memo<ExecuteActionHostResponseProps>(
  ({
    action,
    agentId = action.agents[0],
    canAccessFileDownloadLink,
    textSize = 's',
    'data-test-subj': dataTestSubj,
  }) => {
    const outputContent = useMemo(
      () =>
        action.outputs &&
        action.outputs[agentId] &&
        (action.outputs[agentId].content as ResponseActionExecuteOutputContent),
      [action.outputs, agentId]
    );

    return (
      <>
        <EuiFlexItem>
          <ResponseActionFileDownloadLink
            action={action}
            agentId={agentId}
            buttonTitle={EXECUTE_FILE_LINK_TITLE}
            canAccessFileDownloadLink={canAccessFileDownloadLink}
            data-test-subj={`${dataTestSubj}-getExecuteLink`}
            textSize={textSize}
            showPasscode={true}
          />
        </EuiFlexItem>

        {outputContent && (
          <>
            <EuiSpacer size="l" />
            <EndpointHostExecutionResponseOutput
              outputContent={outputContent}
              data-test-subj={`${dataTestSubj}-executeResponseOutput`}
              textSize={textSize}
            />
          </>
        )}
      </>
    );
  }
);

ExecuteActionHostResponse.displayName = 'ExecuteActionHostResponse';
