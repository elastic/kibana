/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { useKibanaSpace } from '@kbn/observability-shared-plugin/public';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import { selectAgentPolicies } from '../../../state/agent_policies';
import { useLegacyAgentPolicy } from '../../../hooks/use_legacy_agent_policy';

export const PolicyName = ({ agentPolicyId }: { agentPolicyId: string }) => {
  const { canReadAgentPolicies } = useFleetPermissions();
  const { space: currentSpace } = useKibanaSpace();
  const { basePath } = useSyntheticsSettingsContext();

  const { data: policies, loading: isLoadingSpacePolicies } = useSelector(selectAgentPolicies);

  const maybeSpacePolicy = policies?.find((policyT) => policyT.id === agentPolicyId);

  // Only fetch legacy policy if not found in regular policies and not loading
  const shouldFetchLegacy = !isLoadingSpacePolicies && !maybeSpacePolicy && agentPolicyId;
  const { data: legacyPolicy, loading: legacyLoading } = useLegacyAgentPolicy(
    shouldFetchLegacy ? agentPolicyId : null
  );

  const policy = maybeSpacePolicy || legacyPolicy;
  const isLegacyPolicy = !maybeSpacePolicy && legacyPolicy?.id !== undefined;
  const loading = isLoadingSpacePolicies || legacyLoading;

  const agentPolicyUrl = useMemo(() => {
    const spaceId =
      currentSpace && policy?.spaceIds && policy.spaceIds.includes(currentSpace.id)
        ? currentSpace.id
        : policy?.spaceIds[0];
    const appPath = `/app/fleet/policies/${agentPolicyId}`;

    return spaceId === DEFAULT_SPACE_ID ? appPath : `${basePath}${appPath}`;
  }, [agentPolicyId, basePath, currentSpace, policy?.spaceIds]);

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
                href={agentPolicyUrl}
                css={{ marginRight: '4px' }}
              >
                {policy?.name}
              </EuiLink>
              {isLegacyPolicy && (
                <EuiIconTip
                  content={LEGACY_POLICY_TOOLTIP}
                  type="warning"
                  color="warning"
                  size="s"
                />
              )}
            </>
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

const LEGACY_POLICY_TOOLTIP = i18n.translate(
  'xpack.synthetics.monitorManagement.legacyPolicyTooltip',
  {
    defaultMessage:
      "This policy is only available in the default space. Update the policy's space settings to include this space.",
  }
);
