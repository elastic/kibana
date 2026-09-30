/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
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
 * DO NOT USE as it is undergoing refactoring. Use `<ResponseActionResults>` component intead
 * @deprecated
 */
export const ExecuteResults = memo<ExecuteResultsProps>(
  ({ action, agentId, textSize, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    // Component wrapper created only to pass along the `canAccessFileDowloadLink` prop, which after
    // review, it is not necessary in the component at all.

    return (
      <ExecuteActionHostResponse
        action={action}
        agentId={agentId}
        textSize={textSize as ExecuteActionHostResponseProps['textSize']}
        data-test-subj={getTestId()}
        canAccessFileDownloadLink={true}
      />
    );
  }
);
ExecuteResults.displayName = 'ExecuteResults';
