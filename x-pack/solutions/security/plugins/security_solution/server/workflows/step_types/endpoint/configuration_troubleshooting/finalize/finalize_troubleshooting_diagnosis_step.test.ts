/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { finalizeTroubleshootingDiagnosisInputSchema } from '../../../../../../common/workflows/step_types/endpoint/configuration_troubleshooting';
import { createFinalizeTroubleshootingDiagnosisStepDefinition } from './finalize_troubleshooting_diagnosis_step';

interface HealthComponent {
  id: string;
  type: string;
  status: string;
  message: string;
  units: Array<{ id: string; type: string; status: string; message: string }>;
}

const createMockContext = (rawInput: Record<string, unknown>) => {
  const input = finalizeTroubleshootingDiagnosisInputSchema.parse(rawInput);
  return {
    input,
    config: {},
    rawInput: input,
    contextManager: {
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
      getFakeRequest: jest.fn(),
      callKibanaApi: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.finalizeTroubleshootingDiagnosis',
  } as unknown as StepHandlerContext<unknown, unknown>;
};

const hostRecord = (overrides: Record<string, unknown> = {}) => ({
  agent_id: 'agent-1',
  endpoint_id: 'endpoint-1',
  host_status: 'healthy',
  ...overrides,
});

const resolveResult = (overrides: Record<string, unknown> = {}) => ({
  target: { hostname: 'host-1' },
  status: 'resolved',
  hosts: [hostRecord()],
  truncation: { total: 1, returned: 1, truncated: false },
  unauthorized: [],
  unavailable: [],
  ...overrides,
});

const diagnosticsResult = (overrides: Record<string, unknown> = {}) => ({
  agent_id: 'agent-1',
  endpoint_id: 'endpoint-1',
  agent: null,
  policy_response: null,
  unauthorized: [],
  unavailable: [],
  ...overrides,
});

const packageOutput = (overrides: Record<string, unknown> = {}) => ({
  package: { name: 'endpoint', version: '8.0.0', latestVersion: '8.0.0' },
  unauthorized: [],
  unavailable: [],
  ...overrides,
});

const inventoryOutput = (overrides: Record<string, unknown> = {}) => ({
  unauthorized: [],
  unavailable: [],
  ...overrides,
});

const baseInput = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  resolve: { output: { results: [resolveResult()] } },
  host_diagnostics: { output: { results: [diagnosticsResult()] } },
  package_status: { output: packageOutput() },
  inventory_counts: { output: inventoryOutput() },
  target_requested: true,
  include_configurations: false,
  started_at: '2026-01-01T00:00:00',
  ...overrides,
});

const runHandler = (rawInput: Record<string, unknown>, reportEvent: jest.Mock = jest.fn()) =>
  createFinalizeTroubleshootingDiagnosisStepDefinition({
    analytics: { reportEvent },
    now: () => new Date(Date.parse('2026-01-01T00:00:00') + 10_000),
  }).handler(createMockContext(rawInput));

const healthyUnit = (): { id: string; type: string; status: string; message: string } => ({
  id: 'unit',
  type: 'endpoint',
  status: 'HEALTHY',
  message: '',
});

const endpointComponent = (units: HealthComponent['units']): HealthComponent => ({
  id: 'endpoint-default',
  type: 'endpoint',
  status: 'HEALTHY',
  message: '',
  units,
});

describe('createFinalizeTroubleshootingDiagnosisStepDefinition', () => {
  it('adds unavailable:<part> for every part of an expected step that is absent or carries an error', async () => {
    const absent = await runHandler(
      baseInput({
        resolve: undefined,
        host_diagnostics: undefined,
        package_status: undefined,
      })
    );

    expect(absent.output!.caveats).toEqual(
      expect.arrayContaining([
        'unavailable:host_state',
        'unavailable:host_enrollments',
        'unavailable:package_freshness',
        'unavailable:package_configurations',
        'unavailable:package_default_settings',
      ])
    );

    const errored = await runHandler(baseInput({ package_status: { error: 'boom' } }));

    expect(errored.output!.caveats).toEqual(
      expect.arrayContaining([
        'unavailable:package_freshness',
        'unavailable:package_configurations',
        'unavailable:package_default_settings',
      ])
    );
  });

  it('returns a partial diagnosis when a continued sub-step has null output and an error', async () => {
    const { output } = await runHandler(
      baseInput({ package_status: { output: null, error: { message: 'boom' } } })
    );

    expect(output!.target?.agent_id).toBe('agent-1');
    expect(output!.health?.reasons).toContain('policy_response_missing');
    expect(output!.caveats).toEqual(
      expect.arrayContaining([
        'unavailable:package_freshness',
        'unavailable:package_configurations',
        'unavailable:package_default_settings',
      ])
    );
  });

  it('adds nothing for a step that is not expected, even when it is present', async () => {
    const { output } = await runHandler(
      baseInput({ inventory_counts: { output: inventoryOutput({ fleet_agent_count: 3 }) } })
    );

    expect(output!.inventory_counts).toBeUndefined();
    expect(output!.caveats).not.toEqual(
      expect.arrayContaining([
        'unavailable:fleet_agent_count',
        'unavailable:united_metadata_count',
        'unavailable:current_metadata_count',
      ])
    );
  });

  it('gives a Fleet-only resolved target a null policy response and the policy_response_missing reason', async () => {
    const { output } = await runHandler(
      baseInput({
        resolve: {
          output: { results: [resolveResult({ hosts: [hostRecord({ endpoint_id: undefined })] })] },
        },
        host_diagnostics: {
          output: {
            results: [
              diagnosticsResult({ endpoint_id: undefined, agent: null, policy_response: null }),
            ],
          },
        },
      })
    );

    expect(output!.policy_response).toBeNull();
    expect(output!.health?.reasons).toContain('policy_response_missing');
  });

  it('keeps a failing row that the projection order moves ahead of healthy rows and counts dropped rows', async () => {
    const units = [
      healthyUnit(),
      healthyUnit(),
      healthyUnit(),
      healthyUnit(),
      healthyUnit(),
      { ...healthyUnit(), status: 'FAILED' },
    ];
    const { output } = await runHandler(
      baseInput({
        host_diagnostics: {
          output: {
            results: [
              diagnosticsResult({
                agent: { id: 'agent-1', components: [endpointComponent(units)] },
              }),
            ],
          },
        },
      })
    );

    expect(output!.health?.reasons).toContain('unit_unhealthy');
    const keptUnits = output!.agent?.components[0].units ?? [];
    expect(keptUnits.map((unit) => unit.status)).toContain('FAILED');
    expect(keptUnits).toHaveLength(5);
    expect(output!.omitted).toEqual({ components: 0, units: 1, actions: 0 });
  });

  it('sends one run event with a non-negative duration from started_at and no identifiers', async () => {
    const reportEvent = jest.fn();

    await runHandler(baseInput(), reportEvent);

    expect(reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = reportEvent.mock.calls[0];
    expect(eventType).toBe('endpoint_configuration_troubleshooting_diagnose_run');
    expect(payload.duration_ms).toBe(10000);
    expect(payload.duration_ms).toBeGreaterThanOrEqual(0);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('agent-1');
    expect(serialized).not.toContain('endpoint-1');
    expect(serialized).not.toContain('host-1');
  });
});
