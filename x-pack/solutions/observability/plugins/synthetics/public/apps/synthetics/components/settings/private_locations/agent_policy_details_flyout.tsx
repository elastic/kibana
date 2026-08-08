/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import { selectAgentPolicies } from '../../../state/agent_policies';
import type { LocationAgentStats } from '../../../../../../common/types';

export const AgentPolicyDetailsFlyout = ({
  agentPolicyId,
  locationStats,
  onClose,
}: {
  agentPolicyId: string;
  locationStats?: LocationAgentStats;
  onClose: () => void;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const { canReadAgentPolicies } = useFleetPermissions();
  const { data: policies } = useSelector(selectAgentPolicies);
  const policy = policies?.find((p) => p.id === agentPolicyId);

  const policyHref = `${basePath}/app/fleet/policies/${agentPolicyId}`;

  const overviewItems: EuiDescriptionListProps['listItems'] = [
    { title: STATUS_LABEL, description: policy?.status ?? NOT_AVAILABLE },
    { title: AGENTS_LABEL, description: `${policy?.agents ?? 0}` },
    { title: NAMESPACE_LABEL, description: policy?.namespace || '—' },
    { title: DESCRIPTION_LABEL, description: policy?.description || '—' },
    {
      title: SPACES_LABEL,
      description:
        policy?.spaceIds && policy.spaceIds.length > 0 ? (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {policy.spaceIds.map((space) => (
              <EuiFlexItem grow={false} key={space}>
                <EuiBadge>{space}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          '—'
        ),
    },
    { title: POLICY_ID_LABEL, description: agentPolicyId },
  ];

  const agents = locationStats?.agents ?? [];
  const healthyAgents = agents.filter((a) => a.healthy).length;

  return (
    <EuiFlyout
      aria-label={AGENT_POLICY_DETAILS_FLYOUT_ARIA_LABEL}
      onClose={onClose}
      size="s"
      data-test-subj="syntheticsAgentPolicyDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{policy?.name ?? agentPolicyId}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!policy && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              title={POLICY_NOT_FOUND}
              iconType="warning"
            />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiTitle size="xxs">
          <h3>{OVERVIEW_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          columnWidths={[1, 2]}
          compressed
          listItems={overviewItems}
        />

        {locationStats && agents.length > 0 && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>{HEALTH_SECTION}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              compressed
              listItems={[
                {
                  title: HEALTHY_AGENTS_LABEL,
                  description: `${healthyAgents}/${agents.length}`,
                },
              ]}
            />
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose} data-test-subj="syntheticsPolicyFlyoutCloseButton">
              {CLOSE_LABEL}
            </EuiButton>
          </EuiFlexItem>
          {canReadAgentPolicies && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="popout"
                href={policyHref}
                target="_blank"
                data-test-subj="syntheticsPolicyFlyoutFleetLink"
              >
                {VIEW_IN_FLEET_LABEL}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const OVERVIEW_SECTION = i18n.translate('xpack.synthetics.policyFlyout.overviewSection', {
  defaultMessage: 'Overview',
});

const AGENT_POLICY_DETAILS_FLYOUT_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.policyFlyout.agentPolicyDetailsAriaLabel',
  {
    defaultMessage: 'Agent policy details',
  }
);

const HEALTH_SECTION = i18n.translate('xpack.synthetics.policyFlyout.healthSection', {
  defaultMessage: 'Agent health',
});

const STATUS_LABEL = i18n.translate('xpack.synthetics.policyFlyout.status', {
  defaultMessage: 'Status',
});

const AGENTS_LABEL = i18n.translate('xpack.synthetics.policyFlyout.agents', {
  defaultMessage: 'Enrolled agents',
});

const NAMESPACE_LABEL = i18n.translate('xpack.synthetics.policyFlyout.namespace', {
  defaultMessage: 'Namespace',
});

const DESCRIPTION_LABEL = i18n.translate('xpack.synthetics.policyFlyout.description', {
  defaultMessage: 'Description',
});

const SPACES_LABEL = i18n.translate('xpack.synthetics.policyFlyout.spaces', {
  defaultMessage: 'Spaces',
});

const POLICY_ID_LABEL = i18n.translate('xpack.synthetics.policyFlyout.policyId', {
  defaultMessage: 'Policy ID',
});

const HEALTHY_AGENTS_LABEL = i18n.translate('xpack.synthetics.policyFlyout.healthyAgents', {
  defaultMessage: 'Healthy agents',
});

const CLOSE_LABEL = i18n.translate('xpack.synthetics.policyFlyout.close', {
  defaultMessage: 'Close',
});

const VIEW_IN_FLEET_LABEL = i18n.translate('xpack.synthetics.policyFlyout.viewInFleet', {
  defaultMessage: 'View policy in Fleet',
});

const NOT_AVAILABLE = i18n.translate('xpack.synthetics.policyFlyout.notAvailable', {
  defaultMessage: 'N/A',
});

const POLICY_NOT_FOUND = i18n.translate('xpack.synthetics.policyFlyout.policyNotFound', {
  defaultMessage:
    'This policy was not found in the current space. Update the agent policy space to include this space.',
});
