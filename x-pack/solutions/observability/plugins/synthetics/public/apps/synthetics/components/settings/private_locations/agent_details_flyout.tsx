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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import type { AgentStat } from '../../../../../../common/types';

const formatRam = (mib: number): string =>
  mib >= 1024 ? `${(mib / 1024).toFixed(1)} GB` : `${mib} MB`;

/** Fleet agent status → EUI health color. */
const statusColor = (status: string | null): string => {
  switch (status) {
    case 'online':
      return 'success';
    case 'degraded':
    case 'updating':
    case 'enrolling':
      return 'warning';
    case 'error':
    case 'offline':
    case 'unenrolling':
      return 'danger';
    default:
      return 'subdued';
  }
};

export const AgentDetailsFlyout = ({
  agent,
  agentPolicyId,
  monitorsRun,
  onClose,
}: {
  agent: AgentStat;
  agentPolicyId: string;
  /** Monitors this agent runs (all of the location's monitors in the single-agent model). */
  monitorsRun: number;
  onClose: () => void;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const { canReadAgents } = useFleetPermissions();

  // Prefer agent id for Fleet deep-links (exact match).
  const fleetAgentHref = agent.agentId
    ? `${basePath}/app/fleet/agents/${encodeURIComponent(agent.agentId)}`
    : `${basePath}/app/fleet/agents?kuery=${encodeURIComponent(`policy_id:"${agentPolicyId}"`)}`;

  const capacityItems: EuiDescriptionListProps['listItems'] = [
    {
      title: HEALTH_LABEL,
      description: (
        <EuiHealth color={agent.healthy ? 'success' : 'danger'}>
          {agent.healthy ? HEALTHY_LABEL : UNHEALTHY_LABEL}
        </EuiHealth>
      ),
    },
    {
      title: MONITORS_LABEL,
      description: `${monitorsRun}`,
    },
    {
      title: TOTAL_RAM_LABEL,
      description: agent.totalMemoryMib != null ? formatRam(agent.totalMemoryMib) : NOT_AVAILABLE,
    },
    {
      title: MEMORY_USAGE_LABEL,
      description:
        agent.usedMemoryPct != null
          ? `${Math.round(agent.usedMemoryPct * 100)}%${
              agent.usedMemoryMib != null ? ` · ${formatRam(agent.usedMemoryMib)}` : ''
            }`
          : NOT_AVAILABLE,
    },
  ];

  const agentItems: EuiDescriptionListProps['listItems'] = [
    {
      title: AGENT_STATUS_LABEL,
      description: agent.agentStatus ? (
        <EuiHealth color={statusColor(agent.agentStatus)}>{agent.agentStatus}</EuiHealth>
      ) : (
        NOT_AVAILABLE
      ),
    },
    { title: AGENT_ID_LABEL, description: agent.agentId ?? NOT_AVAILABLE },
    { title: AGENT_VERSION_LABEL, description: agent.agentVersion ?? NOT_AVAILABLE },
    {
      title: AGENT_POLICY_LABEL,
      description:
        agent.policyRevision != null ? POLICY_REV_VALUE(agent.policyRevision) : NOT_AVAILABLE,
    },
    { title: PLATFORM_LABEL, description: agent.platform ?? NOT_AVAILABLE },
    {
      title: LAST_CHECKIN_LABEL,
      description: agent.lastCheckin
        ? `${moment(agent.lastCheckin).fromNow()}${
            agent.lastCheckinMessage ? ` · ${agent.lastCheckinMessage}` : ''
          }`
        : NEVER_LABEL,
    },
    {
      title: TAGS_LABEL,
      description:
        agent.tags.length > 0 ? (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {agent.tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge>{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <EuiFlyout
      aria-label={AGENT_DETAILS_FLYOUT_ARIA_LABEL}
      onClose={onClose}
      size="s"
      data-test-subj="syntheticsAgentDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{agent.host || agent.agentId || '—'}</h2>
        </EuiTitle>
        {agent.host && agent.agentId && (
          <EuiText size="s" color="subdued">
            {agent.agentId}
          </EuiText>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xxs">
          <h3>{CAPACITY_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          columnWidths={[1, 2]}
          compressed
          listItems={capacityItems}
        />

        <EuiSpacer size="l" />

        <EuiTitle size="xxs">
          <h3>{AGENT_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList type="column" columnWidths={[1, 2]} compressed listItems={agentItems} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose} data-test-subj="syntheticsAgentFlyoutCloseButton">
              {CLOSE_LABEL}
            </EuiButton>
          </EuiFlexItem>
          {canReadAgents && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="popout"
                href={fleetAgentHref}
                target="_blank"
                data-test-subj="syntheticsAgentFlyoutFleetLink"
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

const CAPACITY_SECTION = i18n.translate('xpack.synthetics.agentFlyout.capacitySection', {
  defaultMessage: 'Health & capacity',
});

const AGENT_DETAILS_FLYOUT_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.agentFlyout.agentDetailsAriaLabel',
  {
    defaultMessage: 'Agent details',
  }
);

const AGENT_SECTION = i18n.translate('xpack.synthetics.agentFlyout.agentSection', {
  defaultMessage: 'Agent',
});

const HEALTH_LABEL = i18n.translate('xpack.synthetics.agentFlyout.health', {
  defaultMessage: 'Health',
});

const MONITORS_LABEL = i18n.translate('xpack.synthetics.agentFlyout.monitors', {
  defaultMessage: 'Monitors run',
});

const TOTAL_RAM_LABEL = i18n.translate('xpack.synthetics.agentFlyout.totalRam', {
  defaultMessage: 'Total host RAM',
});

const MEMORY_USAGE_LABEL = i18n.translate('xpack.synthetics.agentFlyout.memoryUsage', {
  defaultMessage: 'Memory usage',
});

const AGENT_STATUS_LABEL = i18n.translate('xpack.synthetics.agentFlyout.agentStatus', {
  defaultMessage: 'Agent status',
});

const AGENT_ID_LABEL = i18n.translate('xpack.synthetics.agentFlyout.agentId', {
  defaultMessage: 'Agent ID',
});

const AGENT_VERSION_LABEL = i18n.translate('xpack.synthetics.agentFlyout.agentVersion', {
  defaultMessage: 'Agent version',
});

const AGENT_POLICY_LABEL = i18n.translate('xpack.synthetics.agentFlyout.agentPolicy', {
  defaultMessage: 'Agent policy',
});

const POLICY_REV_VALUE = (rev: number) =>
  i18n.translate('xpack.synthetics.agentFlyout.policyRev', {
    defaultMessage: 'rev. {rev}',
    values: { rev },
  });

const PLATFORM_LABEL = i18n.translate('xpack.synthetics.agentFlyout.platform', {
  defaultMessage: 'Platform',
});

const LAST_CHECKIN_LABEL = i18n.translate('xpack.synthetics.agentFlyout.lastCheckin', {
  defaultMessage: 'Last check-in',
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.agentFlyout.tags', {
  defaultMessage: 'Tags',
});

const HEALTHY_LABEL = i18n.translate('xpack.synthetics.agentFlyout.healthy', {
  defaultMessage: 'Healthy',
});

const UNHEALTHY_LABEL = i18n.translate('xpack.synthetics.agentFlyout.unhealthy', {
  defaultMessage: 'Unhealthy',
});

const NEVER_LABEL = i18n.translate('xpack.synthetics.agentFlyout.never', {
  defaultMessage: 'Never',
});

const NOT_AVAILABLE = i18n.translate('xpack.synthetics.agentFlyout.notAvailable', {
  defaultMessage: 'N/A',
});

const CLOSE_LABEL = i18n.translate('xpack.synthetics.agentFlyout.close', {
  defaultMessage: 'Close',
});

const VIEW_IN_FLEET_LABEL = i18n.translate('xpack.synthetics.agentFlyout.viewInFleet', {
  defaultMessage: 'View full details in Fleet',
});
