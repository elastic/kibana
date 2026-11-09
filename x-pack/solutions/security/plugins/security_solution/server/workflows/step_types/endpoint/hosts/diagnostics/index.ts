/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnhealthyReason } from '@kbn/fleet-plugin/common/types';
import { sortBy } from 'lodash';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { boundId, boundText } from '../../common/bound_string';
import { readKibanaApi } from '../../common/read_kibana_api';
import {
  MAX_DIAGNOSTIC_COMPONENTS,
  MAX_DIAGNOSTIC_UNITS,
  MAX_POLICY_ACTIONS,
  getEndpointHostDiagnosticsInputSchema,
  getEndpointHostDiagnosticsStepCommonDefinition,
  isElasticDefendComponent,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import {
  EXCERPT_MAX_CHARS,
  MAX_INPUT_STRING_CHARS,
} from '../../../../../../common/workflows/step_types/common/budget';
import { parseFiniteNumber } from '../../common/number';
import { isNotFound, readErrorOutcome } from '../../common/read_error';

const HEALTHY = 'HEALTHY';
const SUCCESS = 'success';
const ENDPOINT_COMPONENTS_PART = 'agent_components';
const POLICY_RESPONSE_PART = 'policy_response';

type DiagnosticsContextManager = StepHandlerContext<
  typeof getEndpointHostDiagnosticsInputSchema
>['contextManager'];

interface DiagnosticsEntry {
  agent_id: string;
  endpoint_id?: string;
}

interface FleetComponentUnit {
  id?: unknown;
  type?: unknown;
  status?: unknown;
  message?: unknown;
}

interface FleetComponent {
  id?: unknown;
  type?: unknown;
  status?: unknown;
  message?: unknown;
  units?: unknown;
}

interface FleetAgent {
  id?: unknown;
  status?: unknown;
  last_checkin?: unknown;
  last_checkin_status?: unknown;
  last_checkin_message?: unknown;
  unhealthy_reason?: unknown;
  components?: unknown;
}

interface PolicyAction {
  name?: unknown;
  status?: unknown;
  message?: unknown;
}

interface HostPolicyResponse {
  '@timestamp'?: unknown;
  agent?: { id?: unknown; version?: unknown };
  Endpoint?: {
    policy?: {
      applied?: {
        id?: unknown;
        name?: unknown;
        status?: unknown;
        version?: unknown;
        endpoint_policy_version?: unknown;
        actions?: unknown;
      };
    };
  };
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const toIsoTimestamp = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return boundId(asString(value), MAX_INPUT_STRING_CHARS);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
};

const componentGroup = (component: ReturnType<typeof toComponent>): number => {
  if (isElasticDefendComponent(component)) {
    return 0;
  }
  return hasUnhealthyState(component) ? 1 : 2;
};

const hasUnhealthyState = (component: ReturnType<typeof toComponent>): boolean =>
  component.status !== HEALTHY ||
  component.units.some((unit) => asString((unit as FleetComponentUnit)?.status) !== HEALTHY);

const keepComponent = (
  component: ReturnType<typeof toComponent>,
  includeHealthy: boolean
): boolean => includeHealthy || isElasticDefendComponent(component) || hasUnhealthyState(component);

const keepUnit = (unit: { status: string }, includeHealthy: boolean): boolean =>
  includeHealthy || unit.status !== HEALTHY;

const toComponent = (
  value: unknown
): { id: string; type: string; status: string; message: string; units: unknown[] } => {
  const component = (value ?? {}) as FleetComponent;
  return {
    id: asString(component.id),
    type: asString(component.type),
    status: asString(component.status),
    message: asString(component.message),
    units: Array.isArray(component.units) ? component.units : [],
  };
};

const projectUnit = (value: unknown) => {
  const unit = (value ?? {}) as FleetComponentUnit;
  return {
    id: boundId(asString(unit.id), MAX_INPUT_STRING_CHARS),
    type: boundId(asString(unit.type), MAX_INPUT_STRING_CHARS),
    status: boundId(asString(unit.status), MAX_INPUT_STRING_CHARS),
    message: boundText(asString(unit.message), EXCERPT_MAX_CHARS),
  };
};

const projectComponent = (
  value: unknown,
  includeHealthy: boolean
): {
  id: string;
  type: string;
  status: string;
  message: string;
  units: Array<ReturnType<typeof projectUnit>>;
  units_total?: number;
} => {
  const component = toComponent(value);
  const keptUnits = (component.units as FleetComponentUnit[])
    .map((unit) => ({ unit, status: asString(unit?.status) }))
    .filter(({ status }) => keepUnit({ status }, includeHealthy));
  const total = keptUnits.length;
  const ordered = sortBy(keptUnits, ({ status }) => (status === HEALTHY ? 1 : 0));
  const projected = ordered.slice(0, MAX_DIAGNOSTIC_UNITS).map(({ unit }) => projectUnit(unit));

  return {
    id: boundId(asString(component.id), MAX_INPUT_STRING_CHARS),
    type: boundId(asString(component.type), MAX_INPUT_STRING_CHARS),
    status: boundId(asString(component.status), MAX_INPUT_STRING_CHARS),
    message: boundText(asString(component.message), EXCERPT_MAX_CHARS),
    units: projected,
    ...(total > MAX_DIAGNOSTIC_UNITS ? { units_total: total } : {}),
  };
};

const projectAgent = (
  value: FleetAgent,
  includeHealthy: boolean
): {
  id: string;
  status?: string;
  last_checkin?: string;
  last_checkin_status?: string;
  last_checkin_message?: string;
  unhealthy_reason?: string[];
  components: Array<ReturnType<typeof projectComponent>>;
  components_total?: number;
} => {
  const rawComponents = Array.isArray(value.components)
    ? (value.components as FleetComponent[])
    : [];
  const normalized = rawComponents.map(toComponent);
  const kept = normalized.filter((component) => keepComponent(component, includeHealthy));
  const total = kept.length;
  const ordered = sortBy(kept, componentGroup);
  const reasonBound = Object.values(UnhealthyReason).length;

  return {
    id: boundId(asString(value.id), MAX_INPUT_STRING_CHARS),
    ...(value.status !== undefined && value.status !== null
      ? { status: boundId(asString(value.status), MAX_INPUT_STRING_CHARS) }
      : {}),
    ...(value.last_checkin !== undefined && value.last_checkin !== null
      ? { last_checkin: boundId(asString(value.last_checkin), MAX_INPUT_STRING_CHARS) }
      : {}),
    ...(value.last_checkin_status !== undefined && value.last_checkin_status !== null
      ? {
          last_checkin_status: boundId(asString(value.last_checkin_status), MAX_INPUT_STRING_CHARS),
        }
      : {}),
    ...(value.last_checkin_message !== undefined && value.last_checkin_message !== null
      ? { last_checkin_message: boundText(asString(value.last_checkin_message), EXCERPT_MAX_CHARS) }
      : {}),
    ...(Array.isArray(value.unhealthy_reason)
      ? {
          unhealthy_reason: value.unhealthy_reason
            .slice(0, reasonBound)
            .map((reason: unknown) => boundId(asString(reason), MAX_INPUT_STRING_CHARS)),
        }
      : {}),
    components: ordered
      .slice(0, MAX_DIAGNOSTIC_COMPONENTS)
      .map((component) => projectComponent(component, includeHealthy)),
    ...(total > MAX_DIAGNOSTIC_COMPONENTS ? { components_total: total } : {}),
  };
};

const projectPolicyResponse = (
  value: HostPolicyResponse,
  includeHealthy: boolean
): {
  '@timestamp'?: string;
  agent: { id: string; version: string };
  Endpoint: {
    policy: {
      applied: {
        id: string;
        name: string;
        status: string;
        version: number;
        endpoint_policy_version: number;
        actions: Array<{ name: string; status: string; message: string }>;
        actions_total?: number;
      };
    };
  };
} => {
  const applied = value.Endpoint?.policy?.applied ?? {};
  const rawActions = Array.isArray(applied.actions) ? (applied.actions as PolicyAction[]) : [];
  const kept = rawActions.filter((action) =>
    includeHealthy ? true : asString(action.status) !== SUCCESS
  );
  const total = kept.length;
  const ordered = sortBy(kept, (action) => (asString(action.status) === SUCCESS ? 1 : 0));
  const timestamp = toIsoTimestamp(value['@timestamp']);

  return {
    ...(timestamp !== undefined ? { '@timestamp': timestamp } : {}),
    agent: {
      id: boundId(asString(value.agent?.id), MAX_INPUT_STRING_CHARS),
      version: boundId(asString(value.agent?.version), MAX_INPUT_STRING_CHARS),
    },
    Endpoint: {
      policy: {
        applied: {
          id: boundId(asString(applied.id), MAX_INPUT_STRING_CHARS),
          name: boundText(asString(applied.name), MAX_INPUT_STRING_CHARS),
          status: boundId(asString(applied.status), MAX_INPUT_STRING_CHARS),
          version: parseFiniteNumber(applied.version) ?? 0,
          endpoint_policy_version: parseFiniteNumber(applied.endpoint_policy_version) ?? 0,
          actions: ordered.slice(0, MAX_POLICY_ACTIONS).map((action) => ({
            name: boundText(asString(action.name), MAX_INPUT_STRING_CHARS),
            status: boundId(asString(action.status), MAX_INPUT_STRING_CHARS),
            message: boundText(asString(action.message), EXCERPT_MAX_CHARS),
          })),
          ...(total > MAX_POLICY_ACTIONS ? { actions_total: total } : {}),
        },
      },
    },
  };
};

interface ReadOutcome<T> {
  value: T | null;
  unauthorized?: string;
  unavailable?: string;
}

const readFleetAgent = async (
  contextManager: DiagnosticsContextManager,
  agentId: string,
  signal?: AbortSignal
): Promise<ReadOutcome<FleetAgent>> => {
  try {
    const body = await readKibanaApi<{ item?: FleetAgent }>(
      contextManager,
      `/api/fleet/agents/${encodeURIComponent(agentId)}`,
      signal
    );
    return { value: body?.item ?? null };
  } catch (error) {
    return {
      value: null,
      ...(isNotFound(error) ? {} : readErrorOutcome(error, ENDPOINT_COMPONENTS_PART)),
    };
  }
};

const readPolicyResponse = async (
  contextManager: DiagnosticsContextManager,
  endpointId: string,
  signal?: AbortSignal
): Promise<ReadOutcome<HostPolicyResponse>> => {
  const query = new URLSearchParams({ agentId: endpointId });
  try {
    const body = await readKibanaApi<{ policy_response?: HostPolicyResponse }>(
      contextManager,
      `/api/endpoint/policy_response?${query.toString()}`,
      signal
    );
    return { value: body?.policy_response ?? null };
  } catch (error) {
    return {
      value: null,
      ...(isNotFound(error) ? {} : readErrorOutcome(error, POLICY_RESPONSE_PART)),
    };
  }
};

const buildRecord = async (
  contextManager: DiagnosticsContextManager,
  entry: DiagnosticsEntry,
  includeHealthy: boolean,
  signal?: AbortSignal
) => {
  const [agentOutcome, policyOutcome] = await Promise.all([
    readFleetAgent(contextManager, entry.agent_id, signal),
    entry.endpoint_id !== undefined
      ? readPolicyResponse(contextManager, entry.endpoint_id, signal)
      : Promise.resolve<ReadOutcome<HostPolicyResponse>>({ value: null }),
  ]);

  const unauthorized = [agentOutcome.unauthorized, policyOutcome.unauthorized].filter(
    (part): part is string => part !== undefined
  );
  const unavailable = [agentOutcome.unavailable, policyOutcome.unavailable].filter(
    (part): part is string => part !== undefined
  );

  return {
    agent_id: entry.agent_id,
    ...(entry.endpoint_id !== undefined ? { endpoint_id: entry.endpoint_id } : {}),
    agent: agentOutcome.value ? projectAgent(agentOutcome.value, includeHealthy) : null,
    policy_response: policyOutcome.value
      ? projectPolicyResponse(policyOutcome.value, includeHealthy)
      : null,
    unauthorized,
    unavailable,
  };
};

export const getEndpointHostDiagnosticsStepDefinition = createServerStepDefinition({
  ...getEndpointHostDiagnosticsStepCommonDefinition,
  handler: async (context) => {
    const { hosts, include_healthy: includeHealthy } = getEndpointHostDiagnosticsInputSchema.parse(
      context.input
    );
    const results = await Promise.all(
      hosts.map((entry) =>
        buildRecord(context.contextManager, entry, includeHealthy, context.abortSignal)
      )
    );

    return { output: { results } };
  },
});
