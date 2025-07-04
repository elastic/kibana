/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
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
import { ExecuteActionHostResponseOutput } from './execute_action_host_response_output';

export interface ExecuteActionHostResponseProps {
  action: MaybeImmutable<
    | ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>
    | ActionDetails<ResponseActionRunScriptOutputContent, ResponseActionRunScriptParameters>
  >;
  agentId?: string;
  canAccessFileDownloadLink: boolean;
  'data-test-subj'?: string;
  textSize?: 'xs' | 's';
  hideFile?: boolean;
  hideContext?: boolean;
  showPasscode?: boolean;
}

// Note: also used for RunScript command
export const ExecuteActionHostResponse = memo<ExecuteActionHostResponseProps>(
  ({
    action,
    agentId = action.agents[0],
    canAccessFileDownloadLink,
    textSize = 's',
    'data-test-subj': dataTestSubj,
    hideFile,
    hideContext,
    showPasscode,
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
        {!hideFile && (
          <EuiFlexItem>
            <ResponseActionFileDownloadLink
              action={action}
              buttonTitle={EXECUTE_FILE_LINK_TITLE}
              canAccessFileDownloadLink={canAccessFileDownloadLink}
              data-test-subj={`${dataTestSubj}-getExecuteLink`}
              textSize={textSize}
              showPasscode={showPasscode}
            />
            <EuiSpacer size="xxl" />
          </EuiFlexItem>
        )}
        {outputContent && (
          <ExecuteActionHostResponseOutput
            outputContent={outputContent}
            data-test-subj={`${dataTestSubj}-executeResponseOutput`}
            textSize={textSize}
            hideContext={hideContext}
          />
        )}
      </>
    );
  }
);

ExecuteActionHostResponse.displayName = 'ExecuteActionHostResponse';
