/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import { useMonitorAgentAssignments } from '../../settings/private_locations/hooks/use_monitor_agent_assignments';
import {
  isAgentVersionMwCompatible,
  MIN_MW_SUPPORTED_AGENT_VERSION,
} from '../../../../../../common/utils/agent_mw_support';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../common/runtime_types';
import type { MonitorLocationAssignment } from '../../../../../../common/types';

/**
 * Agents that run this monitor at each private location. Classic locations
 * list every enrolled host; scalable locations list the assigned agent.
 */
export const MonitorAssignedAgents = ({
  configId,
  monitorLocations,
  hasMaintenanceWindows = false,
}: {
  configId: string;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
  /** Whether the monitor has a maintenance window assigned, to gate the agent-version warning below. */
  hasMaintenanceWindows?: boolean;
}) => {
  const privateLocations = (monitorLocations ?? []).filter((loc) => !loc.isServiceManaged);
  const { assignments, loading, error } = useMonitorAgentAssignments(
    privateLocations.length > 0 ? configId : undefined
  );
  const { basePath } = useSyntheticsSettingsContext();
  const { canReadAgents, canReadAgentPolicies } = useFleetPermissions();

  if (privateLocations.length === 0) {
    return null;
  }

  const privateLocationIds = new Set(privateLocations.map((loc) => loc.id));
  const entries = assignments.filter(
    (entry) =>
      privateLocationIds.has(entry.locationId) && (entry.isAgentSharding || entry.agents.length > 0)
  );

  const allSharded =
    entries.length > 0
      ? entries.every((entry) => entry.isAgentSharding)
      : privateLocations.every(
          (location) => 'isAgentSharding' in location && location.isAgentSharding === true
        );

  const title = (
    <EuiDescriptionListTitle>
      {allSharded ? ASSIGNED_AGENT_LABEL : LOCATION_AGENTS_LABEL}{' '}
      <EuiIconTip
        content={allSharded ? ASSIGNED_AGENT_HELP : LOCATION_AGENTS_HELP}
        position="right"
        type="question"
      />
    </EuiDescriptionListTitle>
  );

  if (loading && entries.length === 0) {
    return (
      <>
        {title}
        <EuiDescriptionListDescription data-test-subj="monitorAssignedAgentsLoading">
          <EuiSkeletonText lines={2} size="s" />
        </EuiDescriptionListDescription>
      </>
    );
  }

  if (error && entries.length === 0) {
    return (
      <>
        {title}
        <EuiDescriptionListDescription data-test-subj="monitorAssignedAgentsError">
          {ASSIGNED_AGENTS_ERROR_LABEL}
        </EuiDescriptionListDescription>
      </>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  const showLocationLabel = entries.length > 1;

  return (
    <>
      {title}
      <EuiDescriptionListDescription>
        {entries.map((stats) => (
          <AssignmentEntry
            key={stats.locationId}
            stats={stats}
            showLocationLabel={showLocationLabel}
            basePath={basePath}
            canReadAgents={canReadAgents}
            canReadAgentPolicies={canReadAgentPolicies}
            hasMaintenanceWindows={hasMaintenanceWindows}
          />
        ))}
      </EuiDescriptionListDescription>
    </>
  );
};

const AssignmentEntry = ({
  stats,
  showLocationLabel,
  basePath,
  canReadAgents,
  canReadAgentPolicies,
  hasMaintenanceWindows,
}: {
  stats: MonitorLocationAssignment;
  showLocationLabel: boolean;
  basePath: string;
  canReadAgents: boolean;
  canReadAgentPolicies: boolean;
  hasMaintenanceWindows: boolean;
}) => {
  const policyHref = `${basePath}/app/fleet/policies/${stats.agentPolicyId}`;

  return (
    <div key={stats.locationId} css={{ marginBottom: 8 }}>
      {showLocationLabel && (
        <EuiText size="xs" color="subdued">
          {stats.locationLabel}
        </EuiText>
      )}
      {stats.agents.length === 0 ? (
        <EuiText size="s" color="subdued">
          {UNASSIGNED_LABEL}
        </EuiText>
      ) : (
        stats.agents.map((agent) => {
          const hostHref = `${basePath}/app/fleet/agents/${encodeURIComponent(agent.agentId)}`;
          const label = agent.host || agent.agentId;
          return (
            <EuiHealth key={agent.agentId} color={agent.healthy ? 'success' : 'danger'}>
              {canReadAgents ? (
                <EuiLink
                  data-test-subj="syntheticsAssignedAgentLink"
                  href={hostHref}
                  target="_blank"
                  external
                  title={agent.agentId}
                >
                  {label}
                </EuiLink>
              ) : (
                label
              )}
              {agent.host && (
                <EuiText size="xs" color="subdued" component="span">
                  {' '}
                  ({agent.agentId})
                </EuiText>
              )}
              {hasMaintenanceWindows && !isAgentVersionMwCompatible(agent.agentVersion) && (
                <EuiIconTip
                  type="warning"
                  color="warning"
                  content={MW_UNSUPPORTED_AGENT_TOOLTIP(agent.agentVersion)}
                  data-test-subj="syntheticsAssignedAgentMwWarning"
                />
              )}
              {!agent.enrolled && (
                <span data-test-subj="syntheticsAssignedAgentMissingFromFleet">
                  <EuiIconTip type="warning" color="warning" content={MISSING_FROM_FLEET_TOOLTIP} />
                </span>
              )}
            </EuiHealth>
          );
        })
      )}
      <EuiText size="xs" color="subdued">
        {canReadAgentPolicies ? (
          <EuiLink
            data-test-subj="syntheticsAssignedAgentPolicyLink"
            href={policyHref}
            target="_blank"
            external
          >
            {POLICY_CAPTION(stats.agentPolicyName)}
          </EuiLink>
        ) : (
          POLICY_CAPTION(stats.agentPolicyName)
        )}
      </EuiText>
    </div>
  );
};

const LOCATION_AGENTS_LABEL = i18n.translate('xpack.synthetics.monitorDetails.locationAgents', {
  defaultMessage: 'Location agents',
});

const ASSIGNED_AGENT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.assignedAgentLabel', {
  defaultMessage: 'Assigned agent',
});

const LOCATION_AGENTS_HELP = i18n.translate('xpack.synthetics.monitorDetails.locationAgentsHelp', {
  defaultMessage:
    "On a private location this monitor runs on every enrolled agent of the location's agent policy.",
});

const ASSIGNED_AGENT_HELP = i18n.translate(
  'xpack.synthetics.monitorDetails.assignedAgentHelpDescription',
  {
    defaultMessage:
      'On a scalable private location this monitor runs on exactly one assigned agent.',
  }
);

const UNASSIGNED_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.assignedAgentUnassignedLabel',
  {
    defaultMessage: 'Not yet assigned',
  }
);

const MISSING_FROM_FLEET_TOOLTIP = i18n.translate(
  'xpack.synthetics.monitorDetails.assignedAgentMissingFromFleet',
  {
    defaultMessage: 'This agent is no longer enrolled on the location policy.',
  }
);

const ASSIGNED_AGENTS_ERROR_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.assignedAgentsError',
  {
    defaultMessage: 'Unable to load assigned agents.',
  }
);

const MW_UNSUPPORTED_AGENT_TOOLTIP = (agentVersion: string | null) =>
  i18n.translate('xpack.synthetics.monitorDetails.locationAgents.mwUnsupportedTooltip', {
    defaultMessage:
      'Agent version {agentVersion} predates {minVersion} — maintenance window scheduling is not supported, so this monitor may keep running during one.',
    values: {
      agentVersion: agentVersion ?? '',
      minVersion: MIN_MW_SUPPORTED_AGENT_VERSION,
    },
  });

const POLICY_CAPTION = (policyName: string) =>
  i18n.translate('xpack.synthetics.monitorDetails.assignedAgentPolicy', {
    defaultMessage: 'Agent policy: {policyName}',
    values: { policyName },
  });
