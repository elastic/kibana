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
import { useMonitorAgentAssignments } from '../hooks/use_monitor_agent_assignments';

/**
 * "Assigned agent" rows for the monitor details panel: for each scalable
 * (condition-sharded) private location the monitor runs at, the specific agent
 * host it's pinned to and that location's agent policy. Renders nothing when the
 * monitor uses no condition-sharded location, so it's safe to always mount.
 */
export const MonitorAssignedAgents = ({ configId }: { configId: string }) => {
  const { assignments } = useMonitorAgentAssignments(configId);
  const { basePath } = useSyntheticsSettingsContext();
  const { canReadAgents } = useFleetPermissions();

  if (assignments.length === 0) {
    return null;
  }

  const showLocationLabel = assignments.length > 1;

  return (
    <>
      <EuiDescriptionListTitle>
        {ASSIGNED_AGENT_LABEL}{' '}
        <EuiIconTip content={ASSIGNED_AGENT_HELP} position="right" type="question" />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {assignments.map((assignment) => {
          const hostHref = `${basePath}/app/fleet/agents?kuery=${encodeURIComponent(
            `local_metadata.host.hostname:"${assignment.host}" and policy_id:"${assignment.agentPolicyId}"`
          )}`;
          return (
            <div key={assignment.locationId} css={{ marginBottom: 4 }}>
              {showLocationLabel && (
                <EuiText size="xs" color="subdued">
                  {assignment.locationLabel}
                </EuiText>
              )}
              {assignment.host ? (
                <EuiHealth color={assignment.healthy ? 'success' : 'danger'}>
                  {canReadAgents ? (
                    <EuiLink
                      data-test-subj="syntheticsAssignedAgentLink"
                      href={hostHref}
                      target="_blank"
                      external
                    >
                      {assignment.host}
                    </EuiLink>
                  ) : (
                    assignment.host
                  )}
                </EuiHealth>
              ) : (
                <EuiText size="s" color="subdued">
                  {PENDING_ASSIGNMENT_LABEL}
                </EuiText>
              )}
              <EuiText size="xs" color="subdued">
                {POLICY_CAPTION(assignment.agentPolicyName)}
              </EuiText>
            </div>
          );
        })}
      </EuiDescriptionListDescription>
    </>
  );
};

const ASSIGNED_AGENT_LABEL = i18n.translate('xpack.synthetics.monitorDetails.assignedAgent', {
  defaultMessage: 'Assigned agent',
});

const ASSIGNED_AGENT_HELP = i18n.translate('xpack.synthetics.monitorDetails.assignedAgentHelp', {
  defaultMessage:
    'On a scalable private location this monitor is pinned to one agent (by a host condition) for at-most-once execution. If that agent goes stale, the monitor moves to a healthy agent on the next rebalance.',
});

const PENDING_ASSIGNMENT_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.pendingAssignment',
  {
    defaultMessage: 'Pending — not running until the next rebalance assigns an agent',
  }
);

const POLICY_CAPTION = (policyName: string) =>
  i18n.translate('xpack.synthetics.monitorDetails.assignedAgentPolicy', {
    defaultMessage: 'Agent policy: {policyName}',
    values: { policyName },
  });
