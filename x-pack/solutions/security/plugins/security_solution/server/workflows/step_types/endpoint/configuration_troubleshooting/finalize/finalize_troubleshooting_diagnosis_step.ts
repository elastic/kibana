/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  AT_ACTIONS_MAX,
  AT_CANDIDATES_MAX,
  AT_COMPONENTS_MAX,
  AT_MESSAGE_MAX_CHARS,
  AT_UNITS_MAX,
  finalizeTroubleshootingDiagnosisInputSchema,
  finalizeTroubleshootingDiagnosisStepCommonDefinition,
  type TroubleshootingDiagnosis,
} from '../../../../../../common/workflows/step_types/endpoint/configuration_troubleshooting';
import {
  diagnosticsPartValues,
  endpointPartValues,
  inventoryPartValues,
  isElasticDefendComponent,
  packagePartValues,
  resolvePartValues,
  type getEndpointHostDiagnosticsOutputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import { boundText } from '../../common/bound_string';
import { classifyEndpointHealth } from '../classify_endpoint_health';
import type { EndpointConfigurationTroubleshootingTargetResult } from '../../../../../lib/telemetry/event_based/events/endpoint_configuration_troubleshooting';
import {
  reportDiagnoseRun,
  type DiagnoseRunTelemetry,
  type EndpointConfigurationTroubleshootingAnalyticsReporter,
} from './telemetry';

const ENDPOINT_PARTS: ReadonlySet<string> = new Set(endpointPartValues);
const HEALTHY = 'HEALTHY';
const SUCCESS = 'success';
const TARGET_RESULTS: ReadonlySet<string> =
  new Set<EndpointConfigurationTroubleshootingTargetResult>([
    'resolved',
    'ambiguous',
    'not_found',
    'unauthorized',
    'unavailable',
  ]);

type FinalizeInput = z.infer<typeof finalizeTroubleshootingDiagnosisInputSchema>;
type DiagnosticsOutput = z.infer<typeof getEndpointHostDiagnosticsOutputSchema>;
type DiagnosticsRecord = DiagnosticsOutput['results'][number];
type DiagnosticAgent = NonNullable<DiagnosticsRecord['agent']>;
type DiagnosticComponent = DiagnosticAgent['components'][number];
type DiagnosticUnit = DiagnosticComponent['units'][number];
type DiagnosticPolicyResponse = NonNullable<DiagnosticsRecord['policy_response']>;

interface TroubleshootingDiagnosisBuild {
  diagnosis: TroubleshootingDiagnosis;
  targetResult: EndpointConfigurationTroubleshootingTargetResult;
  healthState?: string;
  healthReasons: string[];
  unauthorizedParts: string[];
  unavailableParts: string[];
  packageStale?: boolean;
}

const componentRank = (component: DiagnosticComponent): number => {
  if (component.status !== HEALTHY) {
    return 0;
  }
  return isElasticDefendComponent(component) ? 1 : 2;
};

const projectUnit = (unit: DiagnosticUnit): DiagnosticUnit => ({
  ...unit,
  message: boundText(unit.message, AT_MESSAGE_MAX_CHARS),
});

const projectComponent = (component: DiagnosticComponent): DiagnosticComponent => ({
  ...component,
  message: boundText(component.message, AT_MESSAGE_MAX_CHARS),
  units: sortBy(component.units, (unit) => (unit.status === HEALTHY ? 1 : 0))
    .slice(0, AT_UNITS_MAX)
    .map(projectUnit),
});

const projectAgent = (agent: DiagnosticAgent): DiagnosticAgent => ({
  ...agent,
  components: sortBy(agent.components, componentRank)
    .slice(0, AT_COMPONENTS_MAX)
    .map(projectComponent),
});

const projectPolicyResponse = (
  policyResponse: DiagnosticPolicyResponse
): DiagnosticPolicyResponse => {
  const applied = policyResponse.Endpoint.policy.applied;
  const actions = applied.actions
    .filter((action) => action.status !== SUCCESS)
    .slice(0, AT_ACTIONS_MAX)
    .map((action) => ({ ...action, message: boundText(action.message, AT_MESSAGE_MAX_CHARS) }));
  return {
    ...policyResponse,
    Endpoint: { policy: { applied: { ...applied, actions } } },
  };
};

const toTargetResult = (status: string): EndpointConfigurationTroubleshootingTargetResult =>
  TARGET_RESULTS.has(status)
    ? (status as EndpointConfigurationTroubleshootingTargetResult)
    : 'unavailable';

const buildOmitted = (
  record: DiagnosticsRecord,
  projectedAgent: DiagnosticAgent | null,
  projectedActions: number
): TroubleshootingDiagnosis['omitted'] => {
  const components = projectedAgent
    ? (record.agent?.components.length ?? 0) - projectedAgent.components.length
    : 0;
  const totalUnits = (record.agent?.components ?? []).reduce(
    (count, component) => count + component.units.length,
    0
  );
  const returnedUnits = (projectedAgent?.components ?? []).reduce(
    (count, component) => count + component.units.length,
    0
  );
  const actions =
    (record.policy_response?.Endpoint.policy.applied.actions.filter(
      (action) => action.status !== SUCCESS
    ).length ?? 0) - projectedActions;
  if (components <= 0 && totalUnits - returnedUnits <= 0 && actions <= 0) {
    return undefined;
  }
  return {
    components: Math.max(0, components),
    units: Math.max(0, totalUnits - returnedUnits),
    actions: Math.max(0, actions),
  };
};

const buildTroubleshootingDiagnosis = (input: FinalizeInput): TroubleshootingDiagnosisBuild => {
  const caveats = new Set<string>();
  const unauthorizedParts = new Set<string>();
  const unavailableParts = new Set<string>();
  const addUnauthorized = (parts: readonly string[]): void => {
    for (const part of parts) {
      if (ENDPOINT_PARTS.has(part)) {
        unauthorizedParts.add(part);
        caveats.add(`unauthorized:${part}`);
      }
    }
  };
  const addUnavailable = (parts: readonly string[]): void => {
    for (const part of parts) {
      if (ENDPOINT_PARTS.has(part)) {
        unavailableParts.add(part);
        caveats.add(`unavailable:${part}`);
      }
    }
  };

  const resolveOutput = input.resolve?.output;
  const diagnosticsOutput = input.host_diagnostics?.output;
  const packageOutput = input.package_status?.output;
  const inventoryOutput = input.inventory_counts?.output;

  const r = resolveOutput?.results?.[0];
  const d = diagnosticsOutput?.results?.[0];

  const resolveExpected = input.target_requested;
  const resolveAbsent =
    input.resolve === undefined ||
    input.resolve.error !== undefined ||
    resolveOutput === undefined ||
    r === undefined;

  const diagnosticsExpected = r?.status === 'resolved';
  const diagnosticsAbsent =
    input.host_diagnostics === undefined ||
    input.host_diagnostics.error !== undefined ||
    diagnosticsOutput === undefined ||
    d === undefined;

  const packageAbsent =
    input.package_status === undefined ||
    input.package_status.error !== undefined ||
    packageOutput === undefined;

  const inventoryExpected = !input.target_requested;
  const inventoryAbsent =
    input.inventory_counts === undefined ||
    input.inventory_counts.error !== undefined ||
    inventoryOutput === undefined;

  if (r?.status === 'not_found') {
    caveats.add('target_not_found');
  } else if (r?.status === 'ambiguous') {
    caveats.add('target_ambiguous');
  }

  const target = diagnosticsExpected ? r?.hosts[0] ?? null : null;
  const diagnosticsParts = diagnosticsPartValues.filter(
    (part) => part !== 'policy_response' || target?.endpoint_id !== undefined
  );
  if (target?.host_status === 'unenrolled') {
    caveats.add('host_unenrolled');
  }

  if (r) {
    addUnauthorized(r.unauthorized);
    addUnavailable(r.unavailable);
  }
  if (d) {
    addUnauthorized(d.unauthorized);
    addUnavailable(d.unavailable);
  }
  if (packageOutput) {
    addUnauthorized(packageOutput.unauthorized);
    addUnavailable(packageOutput.unavailable);
  }
  if (inventoryOutput) {
    addUnauthorized(inventoryOutput.unauthorized);
    addUnavailable(inventoryOutput.unavailable);
  }

  if (resolveExpected && resolveAbsent) {
    addUnavailable(resolvePartValues);
  }
  if (diagnosticsExpected && diagnosticsAbsent) {
    addUnavailable(diagnosticsParts);
  }
  if (packageAbsent) {
    addUnavailable(packagePartValues);
  }
  if (inventoryExpected && inventoryAbsent) {
    addUnavailable(inventoryPartValues);
  }

  const projectedAgent = diagnosticsExpected && d?.agent ? projectAgent(d.agent) : null;
  const projectedPolicyResponse =
    diagnosticsExpected && d?.policy_response ? projectPolicyResponse(d.policy_response) : null;
  const projectedActions = projectedPolicyResponse?.Endpoint.policy.applied.actions.length ?? 0;

  const health = diagnosticsExpected
    ? classifyEndpointHealth({
        host: target,
        agent: d?.agent ?? null,
        policyResponse: d?.policy_response ?? null,
        unread: d
          ? { unauthorized: d.unauthorized, unavailable: d.unavailable }
          : { unauthorized: [], unavailable: diagnosticsParts },
      })
    : undefined;

  const packageStatus: TroubleshootingDiagnosis['package_status'] = {
    package: packageOutput?.package ?? null,
    ...(packageOutput?.stale !== undefined ? { stale: packageOutput.stale } : {}),
    ...(packageOutput?.configurations !== undefined
      ? { configurations: packageOutput.configurations }
      : {}),
  };

  const inventoryCounts: TroubleshootingDiagnosis['inventory_counts'] = inventoryExpected
    ? {
        ...(inventoryOutput?.fleet_agent_count !== undefined
          ? { fleet_agent_count: inventoryOutput.fleet_agent_count }
          : {}),
        ...(inventoryOutput?.united_metadata_count !== undefined
          ? { united_metadata_count: inventoryOutput.united_metadata_count }
          : {}),
        ...(inventoryOutput?.current_metadata_count !== undefined
          ? { current_metadata_count: inventoryOutput.current_metadata_count }
          : {}),
      }
    : undefined;

  const omitted =
    diagnosticsExpected && d ? buildOmitted(d, projectedAgent, projectedActions) : undefined;

  const diagnosis: TroubleshootingDiagnosis = {
    target,
    candidates: (r?.hosts ?? []).slice(0, AT_CANDIDATES_MAX),
    ...(r?.truncation !== undefined ? { truncation: r.truncation } : {}),
    ...(diagnosticsExpected
      ? { agent: projectedAgent, policy_response: projectedPolicyResponse }
      : {}),
    ...(health !== undefined ? { health } : {}),
    package_status: packageStatus,
    ...(inventoryCounts !== undefined ? { inventory_counts: inventoryCounts } : {}),
    ...(omitted !== undefined ? { omitted } : {}),
    caveats: [...caveats],
  };

  const targetResult: EndpointConfigurationTroubleshootingTargetResult = !resolveExpected
    ? 'no_target'
    : resolveAbsent
    ? 'unavailable'
    : toTargetResult(r?.status ?? 'unavailable');

  return {
    diagnosis,
    targetResult,
    ...(health !== undefined ? { healthState: health.state } : {}),
    healthReasons: health?.reasons ?? [],
    unauthorizedParts: [...unauthorizedParts],
    unavailableParts: [...unavailableParts],
    ...(packageOutput?.stale !== undefined ? { packageStale: packageOutput.stale } : {}),
  };
};

interface FinalizeTroubleshootingDiagnosisDeps {
  analytics: EndpointConfigurationTroubleshootingAnalyticsReporter;
  now?: () => Date;
}

export const createFinalizeTroubleshootingDiagnosisStepDefinition = (
  deps: FinalizeTroubleshootingDiagnosisDeps
) =>
  createServerStepDefinition({
    ...finalizeTroubleshootingDiagnosisStepCommonDefinition,
    handler: async (context) => {
      const input = finalizeTroubleshootingDiagnosisInputSchema.parse(context.input);
      const build = buildTroubleshootingDiagnosis(input);
      const now = deps.now ?? (() => new Date());
      const startedAtMs = Date.parse(input.started_at);

      const telemetry: DiagnoseRunTelemetry = {
        targetResult: build.targetResult,
        ...(build.healthState !== undefined ? { healthState: build.healthState } : {}),
        healthReasons: build.healthReasons,
        unauthorizedParts: build.unauthorizedParts,
        unavailableParts: build.unavailableParts,
        ...(build.packageStale !== undefined ? { packageStale: build.packageStale } : {}),
        includeConfigurations: input.include_configurations,
        durationMs: Number.isNaN(startedAtMs) ? 0 : Math.max(0, now().getTime() - startedAtMs),
      };

      try {
        reportDiagnoseRun(deps.analytics, telemetry);
      } catch {
        context.logger.warn(
          'Failed to report the endpoint configuration troubleshooting run event'
        );
      }

      return { output: build.diagnosis };
    },
  });
