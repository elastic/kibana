/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, type EuiTextProps } from '@elastic/eui';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionExecuteOutputContent,
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
  canAccessFileDownloadLink: boolean;
  'data-test-subj'?: string;
  hideFile: boolean;
  // should be true for microsoft_defender_endpoint
  shouldShowOutput?: boolean;
  textSize?: Exclude<EuiTextProps['size'], 'm' | 'relative'>;
}

/**
 * Represents the result of a run script action rendered as a memoized React component.
 *
 * This component is used to display a downloadable link for a response action file.
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
  ({
    action,
    agentId = action.agents[0],
    canAccessFileDownloadLink,
    'data-test-subj': dataTestSubj,
    hideFile,
    shouldShowOutput = false,
    textSize = 's',
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
              canAccessFileDownloadLink={canAccessFileDownloadLink}
              data-test-subj={dataTestSubj}
              agentId={agentId}
              textSize={textSize}
              showPasscode={false}
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
