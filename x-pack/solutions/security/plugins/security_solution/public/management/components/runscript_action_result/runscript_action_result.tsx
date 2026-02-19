/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, type EuiTextProps } from '@elastic/eui';
import { EndpointHostExecutionResponseOutput } from '../endpoint_host_execution_response_output';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionEndpointRunScriptOutputContent,
  ResponseActionRunScriptOutputContent,
} from '../../../../common/endpoint/types';
import { RunscriptOutput } from './runscript_action_output';

export interface RunscriptActionResultProps {
  action: MaybeImmutable<
    ActionDetails<
      ResponseActionRunScriptOutputContent | ResponseActionEndpointRunScriptOutputContent
    >
  >;
  /** Defaults to the first agent on the list if left undefined */
  agentId?: string;
  'data-test-subj'?: string;
  textSize?: Exclude<EuiTextProps['size'], 'm' | 'relative'>;
}

/**
 * Represents the result of a run script action rendered as a memoized React component.
 *
 * This component is used to display a downloadable link for a response action file.
 * Also, for specific agent types, it shows the output of the run script action.
 *
 * @param {RunscriptActionResultProps} props - The props object for the component.
 * @param {Object} props.action - The action object containing information about the run script action.
 * @param {string} props.agentId - The identifier of the agent associated with the action.
 * @param {string} [props.textSize='s'] - The size of text to be displayed. Defaults to 's' (small).
 * @param {string} [props['data-test-subj']] - An optional data-test subject attribute for testing purposes.
 *
 * @returns {React.Element} A React component that renders a text block with a file download link.
 */
export const RunscriptActionResult = memo<RunscriptActionResultProps>(
  ({ action, agentId = action.agents[0], 'data-test-subj': dataTestSubj, textSize = 's' }) => {
    const { canWriteExecuteOperations } = useUserPrivileges().endpointPrivileges;
    const showFile = useMemo(() => action.agentType !== 'crowdstrike', [action.agentType]);
    const executionOutput = useMemo(() => {
      if (action.agentType === 'microsoft_defender_endpoint') {
        return (
          <RunscriptOutput
            action={action}
            agentId={agentId}
            data-test-subj={`${dataTestSubj}-output`}
            textSize={textSize}
          />
        );
      }

      if (action.agentType === 'endpoint' && action.outputs?.[agentId]?.content) {
        return (
          <EndpointHostExecutionResponseOutput
            outputContent={
              action.outputs[agentId].content as ResponseActionEndpointRunScriptOutputContent
            }
            textSize="s"
            data-test-subj={`${dataTestSubj}-output`}
          />
        );
      }

      return null;
    }, [action, agentId, dataTestSubj, textSize]);

    return (
      <>
        {showFile && (
          <EuiFlexItem>
            <ResponseActionFileDownloadLink
              action={action}
              canAccessFileDownloadLink={
                (action.agentType === 'sentinel_one' ||
                  action.agentType === 'microsoft_defender_endpoint' ||
                  action.agentType === 'endpoint') &&
                canWriteExecuteOperations
              }
              data-test-subj={`${dataTestSubj}-download`}
              agentId={agentId}
              textSize={textSize}
              showPasscode={action.agentType === 'sentinel_one' || action.agentType === 'endpoint'}
            />
          </EuiFlexItem>
        )}
        {executionOutput && (
          <>
            <EuiSpacer size="l" />
            {executionOutput}
          </>
        )}
      </>
    );
  }
);
RunscriptActionResult.displayName = 'RunscriptActionResult';
