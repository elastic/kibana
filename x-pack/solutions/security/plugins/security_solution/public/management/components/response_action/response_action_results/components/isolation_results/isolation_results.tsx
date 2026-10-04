/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ActionDetails, MaybeImmutable } from '../../../../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { EndpointActionFailureMessage } from '../action_failure_message';

export interface IsolationResultsProps {
  action: MaybeImmutable<ActionDetails>;
  agentId: string;
  'data-test-subj'?: string;
}

/**
 * Used for both `isolate` and `unisolate` response actions.
 * @private
 */
export const IsolationResults = memo<IsolationResultsProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const agentActionState = action.agentState[agentId];

    if (!agentActionState.isCompleted) {
      return <></>;
    }

    return (
      <div data-test-subj={getTestId()}>
        {!agentActionState.wasSuccessful && (
          <EndpointActionFailureMessage
            action={action}
            agentId={agentId}
            data-test-subj={getTestId('failure')}
          />
        )}
      </div>
    );
  }
);
IsolationResults.displayName = 'IsolationResults';
