/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { ActionDetails, MaybeImmutable } from '../../../../../../../common/endpoint/types';
import { EndpointActionFailureMessage } from '../action_failure_message';
import { getAgentActionState } from '../../utils';

export interface ScanResultsProps {
  action: MaybeImmutable<ActionDetails>;
  agentId: string;
  'data-test-subj'?: string;
}

export const ScanResults = memo<ScanResultsProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const agentActionState = useMemo(() => getAgentActionState(action, agentId), [action, agentId]);

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
ScanResults.displayName = 'ScanResults';
