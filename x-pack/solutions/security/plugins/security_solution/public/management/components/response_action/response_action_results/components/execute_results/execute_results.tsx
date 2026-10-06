/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EndpointActionFailureMessage } from '../../../../endpoint_action_failure_message';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { getAgentActionState } from '../../utils';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
} from '../../../../../../../common/endpoint/types';
import { ExecuteActionHostResponse } from '../../../../endpoint_execute_action';
import type { ExecuteActionHostResponseProps } from '../../../../endpoint_execute_action/execute_action_host_response';

export interface ExecuteResultsProps {
  action: MaybeImmutable<
    ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>
  >;
  agentId: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

/**
 * DO NOT USE as it is undergoing refactoring. Use `<ResponseActionResults>` component instead
 * @deprecated
 */
export const ExecuteResults = memo<ExecuteResultsProps>(
  ({ action, agentId, textSize, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { wasSuccessful } = useMemo(
      () => getAgentActionState(action, agentId),
      [action, agentId]
    );

    // Component wrapper created only to pass along the `canAccessFileDowloadLink` prop set to `true`.
    // The prior implementation passed `canAccessFileDownloadLink={canAccessEndpointActionsLogManagement || canReadActionsLogManagement}`,
    // but this is unnecessary since the Action Details API is already gated by these privileges,
    // thus it would not even be possible to retrieve the action details much less attempt to display it.

    return wasSuccessful ? (
      <ExecuteActionHostResponse
        action={action}
        agentId={agentId}
        textSize={textSize as ExecuteActionHostResponseProps['textSize']}
        data-test-subj={getTestId()}
        canAccessFileDownloadLink={true}
      />
    ) : (
      <EndpointActionFailureMessage
        action={action}
        agentId={agentId}
        data-test-subj={getTestId('outputFailureMessage')}
      />
    );
  }
);
ExecuteResults.displayName = 'ExecuteResults';
