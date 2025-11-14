/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiText, type EuiTextProps } from '@elastic/eui';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionRunScriptOutputContent,
} from '../../../../common/endpoint/types';

export interface RunscriptActionResultProps {
  action: MaybeImmutable<ActionDetails<ResponseActionRunScriptOutputContent>>;
  /**
   * If defined, the results will only be displayed for the given agent id.
   * If undefined, then responses for all agents are displayed
   */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
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
  ({ action, agentId, textSize = 's', 'data-test-subj': dataTestSubj }) => {
    // TODO:PT refactor other EDR responses to use this component (centralize all response UI for runscript)

    const { canWriteExecuteOperations } = useUserPrivileges().endpointPrivileges;

    return (
      <EuiText size={textSize}>
        <ResponseActionFileDownloadLink
          action={action}
          canAccessFileDownloadLink={canWriteExecuteOperations}
          data-test-subj={dataTestSubj}
          agentId={agentId}
          textSize={textSize}
          showPasscode={false}
        />
      </EuiText>
    );
  }
);
RunscriptActionResult.displayName = 'RunscriptActionResult';
