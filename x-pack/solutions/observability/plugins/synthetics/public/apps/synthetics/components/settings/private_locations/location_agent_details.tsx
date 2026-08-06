/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiHealth,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import { AgentDetailsFlyout } from './agent_details_flyout';
import type { AgentStat, LocationAgentStats } from '../../../../../../common/types';

/** Used-memory fraction at/above which an agent is flagged as memory-constrained. */
const MEMORY_PRESSURE_PCT = 0.85;

export const LocationAgentDetails = ({
  stats,
  loading,
  agentPolicyId,
  locationLabel,
  locationMonitorCount,
}: {
  stats?: LocationAgentStats;
  loading: boolean;
  agentPolicyId: string;
  locationLabel: string;
  /** Authoritative monitor count for the location (matches the table's "Monitors" column). */
  locationMonitorCount: number;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const { canReadAgentPolicies, canReadAgents } = useFleetPermissions();
  const history = useHistory();
  const [flyoutAgent, setFlyoutAgent] = useState<AgentStat | null>(null);

  const fleetAgentsHref = (kuery: string) =>
    `${basePath}/app/fleet/agents?kuery=${encodeURIComponent(kuery)}`;
  const policyHref = `${basePath}/app/fleet/policies/${agentPolicyId}`;
  const locationMonitorsHref = history.createHref({
    pathname: '/monitors',
    search: `?locations=${JSON.stringify([locationLabel])}`,
  });

  if (loading && !stats) {
    return (
      <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
        <EuiLoadingSpinner size="m" /> {LOADING_LABEL}
      </EuiPanel>
    );
  }

  const agents = stats?.agents ?? [];
  const unassignedMonitors = stats?.unassignedMonitors ?? 0;
  // Sum of per-agent package-policy conditions. Normally equals the location's
  // monitor count; a mismatch means orphaned/pending assignments (surfaced below).
  const totalAssignments = agents.reduce((sum, agent) => sum + agent.monitors, 0);
  const healthyAgents = agents.filter((agent) => agent.healthy).length;
  const staleAgents = agents.filter((agent) => !agent.healthy);
  const pressuredAgents = agents.filter(
    (agent) => agent.usedMemoryPct != null && agent.usedMemoryPct >= MEMORY_PRESSURE_PCT
  );
  const assignmentDelta = totalAssignments - locationMonitorCount;

  // Cluster-wide memory across agents that report it (System integration / host.memory).
  const agentsWithTotal = agents.filter((agent) => agent.totalMemoryMib != null);
  const clusterTotalMib = agentsWithTotal.reduce((sum, a) => sum + (a.totalMemoryMib ?? 0), 0);
  const clusterUsedMib = agents.reduce((sum, a) => sum + (a.usedMemoryMib ?? 0), 0);

  const warnings: React.ReactNode[] = [];
  if (staleAgents.length > 0) {
    warnings.push(STALE_AGENTS_WARNING(staleAgents.length));
  }
  if (pressuredAgents.length > 0) {
    warnings.push(MEMORY_PRESSURE_WARNING(pressuredAgents.length));
  }
  if (unassignedMonitors > 0) {
    warnings.push(UNASSIGNED_WARNING(unassignedMonitors));
  }
  if (assignmentDelta > 0) {
    warnings.push(ASSIGNMENT_MISMATCH_WARNING(assignmentDelta));
  }
  const calloutColor = staleAgents.length > 0 ? 'danger' : 'warning';

  const columns: Array<EuiBasicTableColumn<AgentStat>> = [
    {
      field: 'host',
      name: AGENT_LABEL,
      render: (host: string, agent: AgentStat) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="node" size="s" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="syntheticsAgentDetailsLink"
              onClick={() => setFlyoutAgent(agent)}
              title={VIEW_AGENT_DETAILS}
            >
              <strong>{host}</strong>
            </EuiLink>
          </EuiFlexItem>
          {!agent.enrolled && (
            <EuiFlexItem grow={false}>
              <EuiIconTip type="warning" color="warning" content={UNENROLLED_HELP} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'monitors',
      name: MONITORS_LABEL,
      width: '90px',
      align: 'right',
      render: (monitors: number) =>
        monitors > 0 ? (
          <EuiLink
            data-test-subj="syntheticsAgentMonitorsLink"
            href={locationMonitorsHref}
            title={VIEW_LOCATION_MONITORS}
            className="eui-textNoWrap"
          >
            <strong>{monitors}</strong>
          </EuiLink>
        ) : (
          <EuiText size="s" color="subdued" className="eui-textNoWrap">
            {monitors}
          </EuiText>
        ),
    },
    {
      field: 'monitors',
      name: DISTRIBUTION_COLUMN,
      width: '200px',
      render: (monitors: number, agent: AgentStat) => {
        const pct = totalAssignments > 0 ? Math.round((monitors / totalAssignments) * 100) : 0;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiProgress
                value={monitors}
                max={totalAssignments || 1}
                size="s"
                color={agent.healthy ? 'success' : 'danger'}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" className="eui-textNoWrap">
                {`${pct}%`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'usedMemoryPct',
      name: MEMORY_LABEL,
      width: '230px',
      render: (usedMemoryPct: number | null, agent: AgentStat) => {
        // Neither total RAM nor usage available → N/A (no System integration / host.memory).
        if (usedMemoryPct == null && agent.totalMemoryMib == null) {
          return <MetricNotAvailable content={RAM_UNAVAILABLE_HELP} />;
        }
        // Total known but no live usage (agent metadata only): show capacity.
        if (usedMemoryPct == null) {
          return (
            <EuiText size="s" className="eui-textNoWrap">
              {formatRam(agent.totalMemoryMib as number)}
            </EuiText>
          );
        }
        const pct = Math.round(usedMemoryPct * 100);
        const color = pct >= 85 ? 'danger' : pct >= 70 ? 'warning' : 'success';
        const detail =
          agent.usedMemoryMib != null && agent.totalMemoryMib != null
            ? MEMORY_USED_OF_TOTAL(formatRam(agent.usedMemoryMib), formatRam(agent.totalMemoryMib))
            : agent.usedMemoryMib != null
            ? formatRam(agent.usedMemoryMib)
            : null;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiProgress value={pct} max={100} size="s" color={color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" className="eui-textNoWrap">
                {detail ? `${detail} · ${pct}%` : `${pct}%`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'cpuPct',
      name: CPU_LABEL,
      width: '150px',
      render: (cpuPct: number | null) => {
        if (cpuPct == null) {
          return <MetricNotAvailable content={CPU_UNAVAILABLE_HELP} />;
        }
        const pct = Math.round(cpuPct * 100);
        const color = pct >= 85 ? 'danger' : pct >= 70 ? 'warning' : 'success';
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiProgress value={pct} max={100} size="s" color={color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" className="eui-textNoWrap">
                {`${pct}%`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'healthy',
      name: STATUS_LABEL,
      width: '120px',
      render: (healthy: boolean) => (
        <EuiHealth color={healthy ? 'success' : 'danger'}>
          {healthy ? HEALTHY_LABEL : STALE_LABEL}
        </EuiHealth>
      ),
    },
    {
      field: 'lastCheckin',
      name: LAST_CHECKIN_LABEL,
      width: '160px',
      render: (lastCheckin: number | null) => (
        <EuiText size="s" color="subdued">
          {lastCheckin ? moment(lastCheckin).fromNow() : NEVER_LABEL}
        </EuiText>
      ),
    },
  ];

  return (
    <>
      <EuiPanel
        color="subdued"
        hasShadow={false}
        paddingSize="m"
        data-test-subj="locationAgentDetails"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>
                <EuiIcon
                  type="cluster"
                  size="m"
                  aria-hidden={true}
                  css={{ marginInlineEnd: 6, verticalAlign: 'text-bottom' }}
                />
                {OVERVIEW_TITLE}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />
          {canReadAgentPolicies && (
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="syntheticsViewPolicyInFleetLink"
                href={policyHref}
                target="_blank"
                external
              >
                {VIEW_POLICY_LABEL}
              </EuiLink>
            </EuiFlexItem>
          )}
          {canReadAgents && (
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="syntheticsManageAgentsInFleetLink"
                href={fleetAgentsHref(`policy_id:"${agentPolicyId}"`)}
                target="_blank"
                external
              >
                {MANAGE_AGENTS_LABEL}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiPanel hasShadow={false} hasBorder paddingSize="m">
          <EuiFlexGroup gutterSize="xl" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={locationMonitorCount}
                description={MONITORS_LABEL}
                titleSize="m"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={`${agents.length}`}
                description={AGENTS_LABEL}
                titleSize="m"
                reverse
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={`${healthyAgents}/${agents.length}`}
                description={HEALTHY_AGENTS_LABEL}
                titleSize="m"
                titleColor={healthyAgents === agents.length ? 'success' : 'danger'}
                reverse
              />
            </EuiFlexItem>
            {clusterTotalMib > 0 && (
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={
                    clusterUsedMib > 0
                      ? MEMORY_USED_OF_TOTAL(formatRam(clusterUsedMib), formatRam(clusterTotalMib))
                      : formatRam(clusterTotalMib)
                  }
                  description={
                    <>
                      {CLUSTER_MEMORY_LABEL}{' '}
                      <EuiIconTip content={CLUSTER_MEMORY_HELP} position="top" type="question" />
                    </>
                  }
                  titleSize="m"
                  reverse
                />
              </EuiFlexItem>
            )}
            {unassignedMonitors > 0 && (
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={`${unassignedMonitors}`}
                  description={UNASSIGNED_LABEL}
                  titleSize="m"
                  titleColor="warning"
                  reverse
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>

        {warnings.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              color={calloutColor}
              iconType="warning"
              title={ATTENTION_TITLE}
              data-test-subj="locationAgentWarnings"
            >
              <ul css={{ marginBottom: 0 }}>
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </EuiCallOut>
          </>
        )}

        <EuiSpacer size="m" />

        <EuiTitle size="xxs">
          <h4>
            {DISTRIBUTION_TITLE}{' '}
            <EuiIconTip content={DISTRIBUTION_HELP} position="right" type="question" />
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable<AgentStat>
          items={agents}
          columns={columns}
          tableLayout="auto"
          noItemsMessage={NO_AGENTS_LABEL}
          tableCaption={AGENTS_TABLE_CAPTION}
        />
      </EuiPanel>
      {flyoutAgent && (
        <AgentDetailsFlyout
          agent={flyoutAgent}
          agentPolicyId={agentPolicyId}
          totalMonitors={totalAssignments}
          onClose={() => setFlyoutAgent(null)}
        />
      )}
    </>
  );
};

/**
 * "N/A" with an explanatory tooltip, mirroring Fleet's internal
 * `MetricNonAvailable` (not a public export, so replicated here). Shown when an
 * agent isn't shipping host memory metrics — i.e. no System integration.
 */
const MetricNotAvailable = ({ content }: { content: string }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {NOT_AVAILABLE_LABEL}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip type="info" color="subdued" content={content} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const formatRam = (mib: number): string =>
  mib >= 1024
    ? i18n.translate('xpack.synthetics.privateLocation.agentDetails.ramGb', {
        defaultMessage: '{value} GB',
        values: { value: (mib / 1024).toFixed(1) },
      })
    : i18n.translate('xpack.synthetics.privateLocation.agentDetails.ramMb', {
        defaultMessage: '{value} MB',
        values: { value: mib },
      });

const LOADING_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.loading', {
  defaultMessage: 'Loading agent details…',
});

const MEMORY_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.memory', {
  defaultMessage: 'Memory (used / total)',
});

const CPU_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.cpu', {
  defaultMessage: 'CPU',
});

const MEMORY_USED_OF_TOTAL = (used: string, total: string) =>
  i18n.translate('xpack.synthetics.privateLocation.agentDetails.memoryUsedOfTotal', {
    defaultMessage: '{used} / {total}',
    values: { used, total },
  });

const CPU_UNAVAILABLE_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.cpuUnavailableHelp',
  {
    defaultMessage:
      'Host CPU is unavailable for this agent. Enable the System integration on its agent policy to report CPU usage.',
  }
);

const CLUSTER_MEMORY_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.clusterMemory',
  {
    defaultMessage: 'Cluster memory',
  }
);

const CLUSTER_MEMORY_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.clusterMemoryHelp',
  {
    defaultMessage:
      'Total RAM used and available across agents that report memory. This is the capacity the rebalancer weights each agent by.',
  }
);

const VIEW_LOCATION_MONITORS = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.viewLocationMonitors',
  {
    defaultMessage: "View this location's monitors",
  }
);

const ATTENTION_TITLE = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.attentionTitle',
  {
    defaultMessage: 'Needs attention',
  }
);

const STALE_AGENTS_WARNING = (count: number) =>
  i18n.translate('xpack.synthetics.privateLocation.agentDetails.staleAgentsWarning', {
    defaultMessage:
      '{count, plural, one {# agent is} other {# agents are}} stale — their monitors move to healthy agents on the next rebalance.',
    values: { count },
  });

const MEMORY_PRESSURE_WARNING = (count: number) =>
  i18n.translate('xpack.synthetics.privateLocation.agentDetails.memoryPressureWarning', {
    defaultMessage:
      '{count, plural, one {# agent is} other {# agents are}} memory-constrained (≥85% used). Consider adding an agent to spread the load.',
    values: { count },
  });

const UNASSIGNED_WARNING = (count: number) =>
  i18n.translate('xpack.synthetics.privateLocation.agentDetails.unassignedWarning', {
    defaultMessage:
      '{count, plural, one {# monitor is} other {# monitors are}} not yet pinned to an agent and run on every agent until the next rebalance.',
    values: { count },
  });

const ASSIGNMENT_MISMATCH_WARNING = (count: number) =>
  i18n.translate('xpack.synthetics.privateLocation.agentDetails.assignmentMismatchWarning', {
    defaultMessage:
      '{count, plural, one {# extra assignment} other {# extra assignments}} across agents vs. the location monitor count — likely orphaned package policies.',
    values: { count },
  });

const NOT_AVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.notAvailable',
  {
    defaultMessage: 'N/A',
  }
);

const RAM_UNAVAILABLE_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.ramUnavailableHelp',
  {
    defaultMessage:
      'Host memory is unavailable for this agent. Enable the System integration on its agent policy to report total RAM, which lets sharding weight this agent by capacity.',
  }
);

const OVERVIEW_TITLE = i18n.translate('xpack.synthetics.privateLocation.agentDetails.overview', {
  defaultMessage: 'Sharding overview',
});

const VIEW_POLICY_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.viewPolicy',
  {
    defaultMessage: 'View agent policy',
  }
);

const MANAGE_AGENTS_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.manageAgents',
  {
    defaultMessage: 'Manage agents in Fleet',
  }
);

const VIEW_AGENT_DETAILS = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.viewAgentDetails',
  {
    defaultMessage: 'View agent details',
  }
);

const AGENT_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.agent', {
  defaultMessage: 'Agent (host)',
});

const DISTRIBUTION_COLUMN = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.distributionColumn',
  {
    defaultMessage: 'Distribution',
  }
);

const MONITORS_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.monitors', {
  defaultMessage: 'Monitors',
});

const STATUS_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.status', {
  defaultMessage: 'Status',
});

const HEALTHY_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.healthy', {
  defaultMessage: 'Healthy',
});

const STALE_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.stale', {
  defaultMessage: 'Stale',
});

const LAST_CHECKIN_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.lastCheckin',
  {
    defaultMessage: 'Last agent check-in',
  }
);

const NEVER_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.never', {
  defaultMessage: 'Never',
});

const AGENTS_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.agents', {
  defaultMessage: 'Agents',
});

const HEALTHY_AGENTS_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.healthyAgents',
  {
    defaultMessage: 'Healthy agents',
  }
);

const UNASSIGNED_LABEL = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.unassigned',
  {
    defaultMessage: 'Unassigned',
  }
);

const UNENROLLED_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.unenrolledHelp',
  {
    defaultMessage:
      'This host still has monitors pinned to it but is no longer an enrolled agent. Its monitors move to a healthy agent on the next rebalance.',
  }
);

const DISTRIBUTION_TITLE = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.distributionTitle',
  {
    defaultMessage: 'Monitor distribution per agent',
  }
);

const DISTRIBUTION_HELP = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.distributionHelp',
  {
    defaultMessage:
      'Each monitor is pinned to exactly one agent (by a host condition) for at-most-once execution. Monitors are distributed by memory cost — a browser journey weighs far more than a lightweight check. If an agent goes stale, its monitors move to healthy agents.',
  }
);

const NO_AGENTS_LABEL = i18n.translate('xpack.synthetics.privateLocation.agentDetails.noAgents', {
  defaultMessage: 'No agents enrolled for this location yet.',
});

const AGENTS_TABLE_CAPTION = i18n.translate(
  'xpack.synthetics.privateLocation.agentDetails.tableCaption',
  {
    defaultMessage: 'Per-agent monitor distribution and health for this private location.',
  }
);
