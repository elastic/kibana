/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetServerAgentComponentStatuses } from '@kbn/fleet-plugin/common';
import type { z } from '@kbn/zod/v4';
import { HostPolicyResponseActionStatus, HostStatus } from '../../../../../common/endpoint/types';
import {
  isElasticDefendComponent,
  type fleetAgentSchema,
  type hostPolicyResponseSchema,
  type hostRecordSchema,
} from '../../../../../common/workflows/step_types/endpoint/hosts';
import type {
  HealthReason,
  HealthState,
} from '../../../../../common/workflows/step_types/endpoint/configuration_troubleshooting';

type HostRecord = z.infer<typeof hostRecordSchema>;
type FleetAgentSubset = z.infer<typeof fleetAgentSchema>;
type HostPolicyResponseSubset = z.infer<typeof hostPolicyResponseSchema>;
type ComponentStatus = (typeof FleetServerAgentComponentStatuses)[number];

const UNHEALTHY_COMPONENT_STATUSES: ReadonlySet<string> = new Set<ComponentStatus>([
  'DEGRADED',
  'FAILED',
  'STOPPED',
]);

const TRANSITIONAL_COMPONENT_STATUSES: ReadonlySet<string> = new Set<ComponentStatus>([
  'STARTING',
  'CONFIGURING',
  'STOPPING',
]);

const POLICY_FAILURE_REASONS: readonly HealthReason[] = [
  'policy_response_failure',
  'policy_response_warning',
  'policy_response_unsupported',
  'policy_action_not_success',
  'policy_action_unsupported',
];

const NON_POLICY_FAILURE_REASONS: readonly HealthReason[] = [
  'agent_offline',
  'agent_unhealthy',
  'agent_inactive',
  'host_updating',
  'component_unhealthy',
  'unit_unhealthy',
  'component_transitional',
  'endpoint_unenrolled',
];

const UNDETERMINED_REASONS: readonly HealthReason[] = [
  'policy_response_missing',
  'policy_response_unread',
  'agent_components_unread',
];

export interface ClassifyEndpointHealthUnread {
  unauthorized: readonly string[];
  unavailable: readonly string[];
}

export interface ClassifyEndpointHealthInput {
  host: HostRecord | null;
  agent: FleetAgentSubset | null;
  policyResponse: HostPolicyResponseSubset | null;
  unread: ClassifyEndpointHealthUnread;
}

export interface ClassifyEndpointHealthResult {
  state: HealthState;
  reasons: HealthReason[];
}

const isPartUnread = (
  { unauthorized, unavailable }: ClassifyEndpointHealthUnread,
  part: string
): boolean => unauthorized.includes(part) || unavailable.includes(part);

const addComponentReason = (status: string, add: (reason: HealthReason) => void): void => {
  if (UNHEALTHY_COMPONENT_STATUSES.has(status)) {
    add('component_unhealthy');
  } else if (TRANSITIONAL_COMPONENT_STATUSES.has(status)) {
    add('component_transitional');
  }
};

const addUnitReason = (status: string, add: (reason: HealthReason) => void): void => {
  if (UNHEALTHY_COMPONENT_STATUSES.has(status)) {
    add('unit_unhealthy');
  } else if (TRANSITIONAL_COMPONENT_STATUSES.has(status)) {
    add('component_transitional');
  }
};

const stateForReasons = (reasons: ReadonlySet<HealthReason>): HealthState => {
  if (POLICY_FAILURE_REASONS.some((reason) => reasons.has(reason))) {
    return 'policy_failure';
  }
  if (NON_POLICY_FAILURE_REASONS.some((reason) => reasons.has(reason))) {
    return 'non_policy_failure';
  }
  if (UNDETERMINED_REASONS.some((reason) => reasons.has(reason))) {
    return 'undetermined';
  }
  return 'healthy';
};

export const classifyEndpointHealth = ({
  host,
  agent,
  policyResponse,
  unread,
}: ClassifyEndpointHealthInput): ClassifyEndpointHealthResult => {
  const reasons = new Set<HealthReason>();
  const add = (reason: HealthReason) => {
    reasons.add(reason);
  };

  if (policyResponse) {
    const { applied } = policyResponse.Endpoint.policy;
    if (applied.status === HostPolicyResponseActionStatus.failure) {
      add('policy_response_failure');
    } else if (applied.status === HostPolicyResponseActionStatus.warning) {
      add('policy_response_warning');
    } else if (applied.status === HostPolicyResponseActionStatus.unsupported) {
      add('policy_response_unsupported');
    }

    for (const action of applied.actions) {
      if (
        action.status === HostPolicyResponseActionStatus.failure ||
        action.status === HostPolicyResponseActionStatus.warning
      ) {
        add('policy_action_not_success');
      } else if (action.status === HostPolicyResponseActionStatus.unsupported) {
        add('policy_action_unsupported');
      }
    }
  } else if (isPartUnread(unread, 'policy_response')) {
    add('policy_response_unread');
  } else {
    add('policy_response_missing');
  }

  const hostStatus = host?.host_status;
  if (hostStatus === HostStatus.OFFLINE) {
    add('agent_offline');
  } else if (hostStatus === HostStatus.UNHEALTHY) {
    add('agent_unhealthy');
  } else if (hostStatus === HostStatus.INACTIVE) {
    add('agent_inactive');
  } else if (hostStatus === HostStatus.UPDATING) {
    add('host_updating');
  } else if (hostStatus === HostStatus.UNENROLLED) {
    add('endpoint_unenrolled');
  }

  if (agent) {
    for (const component of agent.components) {
      if (isElasticDefendComponent(component)) {
        addComponentReason(component.status, add);
        for (const unit of component.units) {
          addUnitReason(unit.status, add);
        }
      }
    }
  } else {
    add('agent_components_unread');
  }

  return { state: stateForReasons(reasons), reasons: [...reasons] };
};
