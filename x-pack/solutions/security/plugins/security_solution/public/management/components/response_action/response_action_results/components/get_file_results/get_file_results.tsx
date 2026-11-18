/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EndpointActionFailureMessage } from '../endpoint_action_failure_message';
import { ExportedFileResult } from '../exported_file_result';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import type { ActionDetails } from '../../../../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { getAgentActionState, getExportedOutput } from '../../utils';

export interface GetFileResultsProps {
  action: ActionDetails;
  agentId: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const GetFileResults = memo<GetFileResultsProps>(
  ({ action, agentId, textSize, 'data-test-subj': dataTestSubj }) => {
    // For get-file, we only allow a user to access the files (download link or export location)
    // if they have file operations privilege
    const { canWriteFileOperations } = useUserPrivileges().endpointPrivileges;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const agentActionState = useMemo(() => getAgentActionState(action, agentId), [action, agentId]);
    // Exported files were uploaded to the customer's storage, not Fleet, so there is nothing to download
    const exported = useMemo(() => getExportedOutput(action, agentId), [action, agentId]);

    if (!agentActionState.isCompleted) {
      return <></>;
    }

    return (
      <div data-test-subj={getTestId()}>
        {!agentActionState.wasSuccessful ? (
          <EndpointActionFailureMessage
            action={action}
            agentId={agentId}
            data-test-subj={getTestId('failure')}
          />
        ) : exported ? (
          canWriteFileOperations && (
            <ExportedFileResult
              exported={exported}
              agentType={action.agentType}
              textSize={textSize}
              data-test-subj={getTestId('exportedFileResult')}
            />
          )
        ) : (
          <ResponseActionFileDownloadLink
            action={action}
            agentId={agentId}
            canAccessFileDownloadLink={canWriteFileOperations}
            textSize="xs"
            data-test-subj={getTestId('getFileDownloadLink')}
          />
        )}
      </div>
    );
  }
);
GetFileResults.displayName = 'GetFileResults';
