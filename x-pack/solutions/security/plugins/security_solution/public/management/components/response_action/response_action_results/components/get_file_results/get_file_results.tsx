/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EndpointActionFailureMessage } from '../../../../endpoint_action_failure_message';
import { ResponseActionFileDownloadLink } from '../../../../response_action_file_download_link';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import type { ActionDetails } from '../../../../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

export interface GetFileResultsProps {
  action: ActionDetails;
  agentId: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const GetFileResults = memo<GetFileResultsProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj }) => {
    // For get-file, we only allow a user to access the files if they have file operations privilage
    const { canWriteFileOperations } = useUserPrivileges().endpointPrivileges;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const agentActionState = action.agentState[agentId];

    if (!agentActionState.isCompleted) {
      return <></>;
    }

    if (!agentActionState.wasSuccessful) {
      return (
        <EndpointActionFailureMessage
          action={action}
          agentId={agentId}
          data-test-subj={getTestId('failure')}
        />
      );
    }

    return (
      <ResponseActionFileDownloadLink
        action={action}
        agentId={agentId}
        canAccessFileDownloadLink={canWriteFileOperations}
        textSize="xs"
        data-test-subj={getTestId('getFileDownloadLink')}
      />
    );
  }
);
GetFileResults.displayName = 'GetFileResults';
