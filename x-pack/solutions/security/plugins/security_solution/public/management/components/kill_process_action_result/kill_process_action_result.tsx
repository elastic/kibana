/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiTextColor, EuiCode, EuiText } from '@elastic/eui';
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

    const { wasSuccessful, isCompleted } = useMemo(() => {
      return (
        action.agentState[agentId] ?? {
          wasSuccessful: action.wasSuccessful,
          isCompleted: action.isCompleted,
          completedAt: action.completedAt,
          wasCanceled: action.wasCanceled,
        }
      );
    }, [action, agentId]);

    const processResult: React.ReactNode = useMemo(() => {
      if (!isCompleted) {
        return null;
      }

      const hostOutput = action.outputs?.[agentId]?.content;
      const processResultData: React.ReactNode[] = [];

      if (hostOutput?.pid) {
        processResultData.push(
          <span key={`${agentId}-pid`}>
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.pid"
              defaultMessage="PID {pid}"
              values={{ pid: <EuiCode>{hostOutput?.pid}</EuiCode> }}
            />
          </span>
        );
      }

      if (hostOutput?.entity_id) {
        if (processResultData.length > 0) {
          processResultData.push(<DataSeparator key={`${agentId}-entityId-sep`} />);
        }

        processResultData.push(
          <span key={`${agentId}-entityId`}>
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.entityId"
              defaultMessage="Entity ID {entityId}"
              values={{ entityId: <EuiCode>{hostOutput?.entity_id}</EuiCode> }}
            />
          </span>
        );
      }

      if (hostOutput?.process_name) {
        if (processResultData.length > 0) {
          processResultData.push(<DataSeparator key={`${agentId}-processName-sep`} />);
        }

        processResultData.push(
          <span key={`${agentId}-processName`}>
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.processName"
              defaultMessage="Name {processName}"
              values={{ processName: <EuiCode>{hostOutput?.process_name}</EuiCode> }}
            />
          </span>
        );
      }

      if (hostOutput?.command) {
        if (processResultData.length > 0) {
          processResultData.push(<DataSeparator key={`${agentId}-command-sep`} />);
        }

        processResultData.push(
          <span key={`${agentId}-command`}>
            <FormattedMessage
              id="xpack.securitySolution.management.killProcessActionResult.command"
              defaultMessage="Command {command}"
              values={{ command: <EuiCode>{hostOutput?.command}</EuiCode> }}
            />
          </span>
        );
      }

      return processResultData;
    }, [action.outputs, agentId, isCompleted]);

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
                  defaultMessage="Action result:"
                />
                <div>{processResult}</div>
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

export const DataSeparator = memo(() => {
  return <EuiTextColor color="subdued">{' | '}</EuiTextColor>;
});
DataSeparator.displayName = 'DataSeparator';
