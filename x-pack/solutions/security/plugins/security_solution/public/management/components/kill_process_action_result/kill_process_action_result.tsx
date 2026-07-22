/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EndpointActionFailureMessage } from '../endpoint_action_failure_message';
import { OUTPUT_MESSAGES, UX_MESSAGES } from '../endpoint_response_actions_list/translations';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type {
  ActionDetails,
  KillProcessActionOutputContent,
  MaybeImmutable,
  ResponseActionParametersWithProcessData,
} from '../../../../common/endpoint/types';

export interface KillProcessActionResultProps {
  action: MaybeImmutable<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithProcessData>
  >;
  /** The agent id to display the result for. If undefined, the output for ALL agents will be displayed */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const KillProcessActionResult = memo<KillProcessActionResultProps>(
  ({ action: _action, agentId, textSize = 's', 'data-test-subj': dataTestSubj }) => {
    const action = _action as ActionDetails<
      KillProcessActionOutputContent,
      ResponseActionParametersWithProcessData
    >;
    const getTestId = useTestIdGenerator(dataTestSubj);

    const agents: string[] = useMemo(() => {
      return agentId ? [agentId] : action.agents;
    }, [agentId, action.agents]);

    const isSingleAgent = agents.length === 1;

    if (action.command !== 'kill-process') {
      window.console.warn(`EndpointUploadActionResult: called with a non-upload action`);
      return <></>;
    }

    return (
      <EuiText size={textSize} data-test-subj={getTestId()}>
        {agents.map((agent) => {
          const { wasSuccessful, wasCanceled, isCompleted, completedAt } = action.agentState[
            agent
          ] ?? {
            wasSuccessful: action.wasSuccessful,
            isCompleted: action.isCompleted,
            completedAt: action.completedAt,
            wasCanceled: action.wasCanceled,
          };
          // TODO:PT remove usage of i18n values from the History Log page
          const hostStatusMessage = !isCompleted
            ? OUTPUT_MESSAGES.isPending(action.command)
            : wasCanceled
            ? UX_MESSAGES.badge.canceled
            : wasSuccessful
            ? OUTPUT_MESSAGES.wasSuccessful(action.command)
            : action.isExpired
            ? OUTPUT_MESSAGES.hasExpired(action.command)
            : OUTPUT_MESSAGES.hasFailed(action.command);
          const hostName = action.hosts[agent]?.name ?? agent;
          const hostOutput = action.outputs?.[agent]?.content;

          return (
            <div key={agent}>
              {!isSingleAgent ? (
                <div>
                  <strong>
                    {hostName}
                    {': '}
                  </strong>
                  <span>{hostStatusMessage}</span>
                  {isCompleted && (
                    <div>
                      {OUTPUT_MESSAGES.expandSection.completedAt} {completedAt}
                    </div>
                  )}
                </div>
              ) : (
                hostStatusMessage
              )}

              {/* If complete, then show the output returned for this agent */}
              {isCompleted && (
                <div>
                  {wasSuccessful ? (
                    <div>
                      <FormattedMessage
                        id="xpack.securitySolution.management.killProcessActionResult.processInfo"
                        defaultMessage="The following process was terminated:"
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
                      agentId={agent}
                      data-test-subj={getTestId(`${agentId}-outputFailureMessage`)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </EuiText>
    );
  }
);
KillProcessActionResult.displayName = 'KillProcessActionResult';
