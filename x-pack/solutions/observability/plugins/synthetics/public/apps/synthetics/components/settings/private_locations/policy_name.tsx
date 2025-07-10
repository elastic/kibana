/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiLink, EuiLoadingSpinner, EuiText, EuiTextColor } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import { selectAgentPolicies } from '../../../state/agent_policies';

export const PolicyName = ({ agentPolicyId }: { agentPolicyId: string }) => {
  const { canReadAgentPolicies } = useFleetPermissions();

  const { basePath } = useSyntheticsSettingsContext();

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
            <EuiLink
              data-test-subj="syntheticsPolicyNameLink"
              href={`${basePath}/app/fleet/policies/${agentPolicyId}`}
            >
              {policy?.name}
            </EuiLink>
          ) : (
            <EuiText color="danger" size="s" className="eui-displayInline">
              {POLICY_IS_DELETED}
            </EuiText>
          )}
        </EuiTextColor>
      ) : (
        agentPolicyId
      )}
      {canReadAgentPolicies && (
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

const POLICY_IS_DELETED = i18n.translate('xpack.synthetics.monitorManagement.deletedPolicy', {
  defaultMessage: 'Policy is deleted',
});

const AGENTS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agents', {
  defaultMessage: 'Agents: ',
});
