/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { getAgentStatusText } from './translations';
import { getEmptyTagValue } from '../../../empty_value';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { useGetAgentStatus } from '../../../../../management/hooks/agents/use_get_agent_status';
import { useTestIdGenerator } from '../../../../../management/hooks/use_test_id_generator';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../../../management/pages/endpoint_hosts/view/host_constants';
import { AgentResponseActionsStatus } from './agent_response_action_status';
import type { AgentStatusInfo } from '../../../../../../common/endpoint/types';

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

export interface AgentStatusProps {
  agentType: ResponseActionAgentType;
  /**
   * The agent id for which the status will be displayed. An API call will be made to retrieve the
   * status. If using this component on a List view, use `statusInfo` prop instead and make API
   * call to retrieve all statuses of displayed agents at the view level in order to keep API calls
   * to a minimum
   *
   * NOTE: will be ignored if `statusInfo` prop is defined!
   */
  agentId?: string;
  /**
   * The status info for the agent. When both `agentId` and `agentInfo` are defined, `agentInfo` will
   * be used and `agentId` ignored.
   */
  statusInfo?: AgentStatusInfo;
  'data-test-subj'?: string;
}

/**
 * Display the agent status of a host that supports response actions.
 *
 * IMPORTANT: If using this component on a list view, ensure that `statusInfo` prop is used instead
 *            of `agentId` in order to ensure API calls are kept to a minimum and the list view
 *            remains more performant.
 */
export const AgentStatus = React.memo(
  ({ agentId, agentType, statusInfo, 'data-test-subj': dataTestSubj }: AgentStatusProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const enableApiCall = useMemo(() => {
      return !statusInfo || !agentId;
    }, [agentId, statusInfo]);
    const { data, isLoading, isFetched } = useGetAgentStatus(agentId ?? '', agentType, {
      enabled: enableApiCall,
    });
    const agentStatus: AgentStatusInfo | undefined = useMemo(() => {
      if (statusInfo) {
        return statusInfo;
      }
      return data?.[agentId ?? ''];
    }, [agentId, data, statusInfo]);

    const isCurrentlyIsolated = Boolean(agentStatus?.isolated);

    const [hasPendingActions, hostPendingActions] = useMemo<
      [boolean, AgentStatusInfo['pendingActions']]
    >(() => {
      const pendingActions = agentStatus?.pendingActions;

      if (!pendingActions) {
        return [false, {}];
      }

      return [Object.keys(pendingActions).length > 0, pendingActions];
    }, [agentStatus?.pendingActions]);

    return (
      <EuiFlexGroupStyled
        gutterSize="none"
        responsive={false}
        className="eui-textTruncate"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          {isFetched && !isLoading && agentStatus ? (
            <EuiBadge
              color={HOST_STATUS_TO_BADGE_COLOR[agentStatus.status]}
              className="eui-textTruncate"
              data-test-subj={getTestId('agentStatus')}
            >
              {getAgentStatusText(agentStatus.status)}
            </EuiBadge>
          ) : (
            getEmptyTagValue()
          )}
        </EuiFlexItem>
        {(isCurrentlyIsolated || hasPendingActions) && (
          <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
            <AgentResponseActionsStatus
              data-test-subj={getTestId('actionStatuses')}
              isIsolated={isCurrentlyIsolated}
              pendingActions={hostPendingActions}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroupStyled>
    );
  }
);

AgentStatus.displayName = 'AgentStatus';
