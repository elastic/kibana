/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, type EuiTextProps } from '@elastic/eui';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionRunScriptOutputContent,
} from '../../../../common/endpoint/types';
import { RunscriptOutput } from './runscript_action_output';
import { RunscriptActionNoOutput } from './runscript_action_no_output';

export interface RunscriptActionResultProps {
  action: MaybeImmutable<ActionDetails<ResponseActionRunScriptOutputContent>>;
  /**
   * If defined, the results will only be displayed for the given agent id.
   * If undefined, then responses for all agents are displayed
   */
  agentId?: string;
  agentType?: ResponseActionAgentType;
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
    const shouldShowOutput = useMemo(
      () => action.agentType === 'microsoft_defender_endpoint',
      [action.agentType]
    );

    const outputContent = useMemo(
      () => action.outputs && action.outputs[agentId] && action.outputs[agentId].content,
      [action.outputs, agentId]
    );

    return (
      <>
        {showFile && (
          <EuiFlexItem>
            <ResponseActionFileDownloadLink
              action={action}
              canAccessFileDownloadLink={
                (action.agentType === 'sentinel_one' ||
                  action.agentType === 'microsoft_defender_endpoint') &&
                canWriteExecuteOperations
              }
              data-test-subj={dataTestSubj}
              agentId={agentId}
              textSize={textSize}
              showPasscode={action.agentType === 'sentinel_one'}
            />
          </EuiFlexItem>
        )}
        {shouldShowOutput && !outputContent && (
          <>
            <EuiSpacer size="l" />
            <EuiFlexItem>
              <RunscriptActionNoOutput textSize={textSize} data-test-subj={dataTestSubj} />
            </EuiFlexItem>
          </>
        )}
        {shouldShowOutput && outputContent && (
          <>
            <EuiSpacer size="l" />
            <RunscriptOutput
              outputContent={outputContent}
              data-test-subj={dataTestSubj}
              textSize={textSize}
            />
          </>
        )}
      </>
    );
  }
);
RunscriptActionResult.displayName = 'RunscriptActionResult';
