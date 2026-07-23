/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RESPONSE_ACTION_STATUS } from '../../common/translations';
import { EndpointActionFailureMessage } from '../endpoint_action_failure_message';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type {
  ActionDetails,
  KillProcessActionOutputContent,
  MaybeImmutable,
  ResponseActionParametersWithProcessData,
  SuspendProcessActionOutputContent,
} from '../../../../common/endpoint/types';

export interface KillSuspendProcessActionResultProps {
  action: MaybeImmutable<
    ActionDetails<
      KillProcessActionOutputContent | SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >
  >;
  /** The agent id to display the result for. defaults to the first one in `action.agents[]` */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const KillSuspendProcessActionResult = memo<KillSuspendProcessActionResultProps>(
  ({ action: _action, agentId: _agentId, textSize = 's', 'data-test-subj': dataTestSubj }) => {
    const action = _action as ActionDetails<
      // the use of `&` in the cast below is intentional to ensure that both types are handled in the output content
      KillProcessActionOutputContent & SuspendProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const agentId = _agentId || action.agents[0];
    const command = action.command;
    const { wasSuccessful, isCompleted } = action.agentState[agentId] ?? {
      wasSuccessful: action.wasSuccessful,
      isCompleted: action.isCompleted,
      completedAt: action.completedAt,
      wasCanceled: action.wasCanceled,
    };
    const hostOutput = action.outputs?.[agentId]?.content;

    if (command !== 'kill-process' && command !== 'suspend-process') {
      window.console.warn(
        `KillProcessActionResult: Action provided not a kill-process or suspend-process command`
      );
      return <></>;
    }

    return (
      <EuiText size={textSize} data-test-subj={getTestId()}>
        {!isCompleted && (
          <span data-test-subj={getTestId('pending')}>{RESPONSE_ACTION_STATUS.pendingMessage}</span>
        )}

        {/* If complete, then show the output returned for this agent */}
        {isCompleted && (
          <div>
            {wasSuccessful ? (
              <div>
                <FormattedMessage
                  id="xpack.securitySolution.management.killProcessActionResult.processInfo"
                  defaultMessage="Result:"
                />

                {hostOutput?.pid && (
                  <div>
                    <FormattedMessage
                      id="xpack.securitySolution.management.killProcessActionResult.pid"
                      defaultMessage="Process ID: {pid}"
                      values={{ pid: hostOutput?.pid }}
                    />
                  </div>
                )}
                {hostOutput?.entity_id && (
                  <div>
                    <FormattedMessage
                      id="xpack.securitySolution.management.killProcessActionResult.entityId"
                      defaultMessage="Entity ID: {entityId}"
                      values={{ entityId: hostOutput?.entity_id }}
                    />
                  </div>
                )}
                {hostOutput?.process_name && (
                  <div>
                    <FormattedMessage
                      id="xpack.securitySolution.management.killProcessActionResult.processName"
                      defaultMessage="Process name: {processName}"
                      values={{ processName: hostOutput?.process_name }}
                    />
                  </div>
                )}
                {hostOutput?.command && (
                  <div>
                    <FormattedMessage
                      id="xpack.securitySolution.management.killProcessActionResult.command"
                      defaultMessage="Process command: {command}"
                      values={{ command: hostOutput?.command }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <EndpointActionFailureMessage
                action={action}
                agentId={agentId}
                data-test-subj={getTestId(`${agentId}-outputFailureMessage`)}
              />
            )}
          </div>
        )}
      </EuiText>
    );
  }
);
KillSuspendProcessActionResult.displayName = 'KillSuspendProcessActionResult';
