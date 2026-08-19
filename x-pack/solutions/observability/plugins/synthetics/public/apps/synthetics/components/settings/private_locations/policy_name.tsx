/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { useFleetPermissions } from '../../../hooks';
import { selectAgentPolicies } from '../../../state/agent_policies';
import { AgentPolicyDetailsFlyout } from './agent_policy_details_flyout';
import type { LocationAgentStats } from '../../../../../../common/types';

export const PolicyName = ({
  agentPolicyId,
  locationStats,
  hideAgentCount = false,
}: {
  agentPolicyId: string;
  locationStats?: LocationAgentStats;
  /** Suppress the "Agents: N" badge when the caller already renders an agent count. */
  hideAgentCount?: boolean;
}) => {
  const { canReadAgentPolicies } = useFleetPermissions();
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const { data: policies, loading } = useSelector(selectAgentPolicies);

  const policy = policies?.find((policyT) => policyT.id === agentPolicyId);

  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiText size="s">
      {canReadAgentPolicies ? (
        <EuiTextColor color="subdued">
          {policy ? (
            <>
              <EuiLink
                data-test-subj="syntheticsPolicyNameLink"
                onClick={() => setFlyoutOpen(true)}
              >
                {policy?.name}
              </EuiLink>
              {flyoutOpen && (
                <AgentPolicyDetailsFlyout
                  agentPolicyId={agentPolicyId}
                  locationStats={locationStats}
                  onClose={() => setFlyoutOpen(false)}
                />
              )}
            </>
          ) : (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={true}>
                <EuiText size="xs" className="eui-displayInline">
                  {agentPolicyId}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  aria-label={POLICY_NOT_FOUND}
                  size="m"
                  type="warning"
                  color="warning"
                  content={POLICY_NOT_FOUND}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiTextColor>
      ) : (
        agentPolicyId
      )}
      {canReadAgentPolicies && policy && !hideAgentCount && (
        <>
          &nbsp; &nbsp;
          <EuiBadge color={policy?.agents === 0 ? 'warning' : 'hollow'}>
            {AGENTS_LABEL}
            {policy?.agents}
          </EuiBadge>
        </>
      )}
    </EuiText>
  );
};

const POLICY_NOT_FOUND = i18n.translate('xpack.synthetics.monitorManagement.policyNotFound', {
  defaultMessage:
    'Policy not found in the current space, please update the agent policy space to include this space.',
});

const AGENTS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agents', {
  defaultMessage: 'Agents: ',
});
