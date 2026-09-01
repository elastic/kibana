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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useFleetPermissions } from '../../../hooks';
import { useAgentStats } from '../../settings/private_locations/hooks/use_agent_stats';
import {
  isAgentVersionMwCompatible,
  MIN_MW_SUPPORTED_AGENT_VERSION,
} from '../../../../../../common/utils/agent_mw_support';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../common/runtime_types';

/**
 * "Location agents" rows for the monitor details panel: for each private
 * location the monitor runs at, the location's agent policy and the enrolled
 * agent hosts that run it (every enrolled agent runs the monitor today).
 * Renders nothing when the monitor uses no private location, so it's safe to
 * always mount.
 */
export const MonitorAssignedAgents = ({
  monitorLocations,
  hasMaintenanceWindows = false,
}: {
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
  /** Whether the monitor has a maintenance window assigned, to gate the agent-version warning below. */
  hasMaintenanceWindows?: boolean;
}) => {
  const { byLocation } = useAgentStats();
  const { basePath } = useSyntheticsSettingsContext();
  const { canReadAgents, canReadAgentPolicies } = useFleetPermissions();

  const privateLocations = (monitorLocations ?? []).filter((loc) => !loc.isServiceManaged);
  const entries = privateLocations
    .map((loc) => byLocation.get(loc.id))
    .filter(
      (stats): stats is NonNullable<typeof stats> => stats != null && stats.agents.length > 0
    );

  if (entries.length === 0) {
    return null;
  }

  const showLocationLabel = entries.length > 1;

  return (
    <>
      <EuiDescriptionListTitle>
        {LOCATION_AGENTS_LABEL}{' '}
        <EuiIconTip content={LOCATION_AGENTS_HELP} position="right" type="question" />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {entries.map((stats) => {
          const policyName = stats.agentPolicyName;
          const policyHref = `${basePath}/app/fleet/policies/${stats.agentPolicyId}`;
          return (
            <div key={stats.locationId} css={{ marginBottom: 8 }}>
              {showLocationLabel && (
                <EuiText size="xs" color="subdued">
                  {stats.locationLabel}
                </EuiText>
              )}
              {stats.agents.map((agent) => {
                const hostHref = agent.agentId
                  ? `${basePath}/app/fleet/agents/${encodeURIComponent(agent.agentId)}`
                  : `${basePath}/app/fleet/agents?kuery=${encodeURIComponent(
                      `policy_id:"${stats.agentPolicyId}"`
                    )}`;
                const label = agent.host || agent.agentId || '—';
                return (
                  <EuiHealth
                    key={agent.agentId ?? agent.host}
                    color={agent.healthy ? 'success' : 'danger'}
                  >
                    {canReadAgents ? (
                      <EuiLink
                        data-test-subj="syntheticsAssignedAgentLink"
                        href={hostHref}
                        target="_blank"
                        external
                        title={agent.agentId ?? label}
                      >
                        {label}
                      </EuiLink>
                    ) : (
                      label
                    )}
                    {agent.host && agent.agentId && (
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
                  </EuiHealth>
                );
              })}
              <EuiText size="xs" color="subdued">
                {canReadAgentPolicies ? (
                  <EuiLink
                    data-test-subj="syntheticsAssignedAgentPolicyLink"
                    href={policyHref}
                    target="_blank"
                    external
                  >
                    {POLICY_CAPTION(policyName)}
                  </EuiLink>
                ) : (
                  POLICY_CAPTION(policyName)
                )}
              </EuiText>
            </div>
          );
        })}
      </EuiDescriptionListDescription>
    </>
  );
};

const LOCATION_AGENTS_LABEL = i18n.translate('xpack.synthetics.monitorDetails.locationAgents', {
  defaultMessage: 'Location agents',
});

const LOCATION_AGENTS_HELP = i18n.translate('xpack.synthetics.monitorDetails.locationAgentsHelp', {
  defaultMessage:
    "On a private location this monitor runs on every enrolled agent of the location's agent policy.",
});

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
