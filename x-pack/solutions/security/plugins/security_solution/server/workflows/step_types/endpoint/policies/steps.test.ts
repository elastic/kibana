/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { EndpointAuthorizationError } from '../../../../endpoint/errors';
import {
  PolicyAmbiguousNameError,
  PolicyNotFoundError,
  PolicyWriteUnverifiedError,
} from '../../../../endpoint/services/policy_management/services/policy_errors';
import { presentPolicyError } from '../../../../endpoint/services/policy_management/presentation/present_policy_error';
import { presentPolicyStepError } from './present_policy_step_error';
import { PolicyChangeRejectedError } from '../../../../endpoint/services/policy_management/domain/impact';
import { getFieldRegistryEntry } from '../../../../endpoint/services/policy_management/domain/field_registry';
import * as services from '../../../../endpoint/services/policy_management/services/endpoint_policy_management_service';
import {
  createGetEndpointPolicyStepDefinition,
  createListEndpointPoliciesStepDefinition,
  createGetEndpointPolicyBaselineStepDefinition,
  createGetEndpointPolicyRolloutStatusStepDefinition,
  createGetEndpointPolicyFieldReferenceStepDefinition,
  createCompareEndpointPoliciesStepDefinition,
  createAssessEndpointPolicyChangeStepDefinition,
} from './steps';

const createContext = <Input extends z.ZodType>(
  input: z.infer<Input>,
  request = httpServerMock.createKibanaRequest()
): StepHandlerContext<Input> =>
  ({
    input,
    config: {},
    rawInput: input,
    contextManager: {
      callKibanaApi: jest.fn().mockResolvedValue({ body: { id: 'marketing' } }),
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'marketing' } }),
    },
    logger: loggerMock.create(),
    abortSignal: new AbortController().signal,
    stepId: 'read',
    stepType: 'security.getEndpointPolicy',
  } as never);

const getRegistryEntry = () => {
  const entry = getFieldRegistryEntry('windows.malware.mode');
  if (!entry) throw new Error('expected registered field');
  return entry;
};

const createServiceMock = () => {
  const service = {
    getPolicy: jest.fn(),
    listPolicies: jest.fn(),
    getPolicyBaseline: jest.fn(),
    getPolicyRolloutStatus: jest.fn(),
    getPolicyFieldReference: jest.fn(),
    comparePolicies: jest.fn(),
    assessPolicyChange: jest.fn(),
  };
  jest.spyOn(services, 'createEndpointPolicyManagementService').mockReturnValue(service as never);
  return service;
};

afterEach(() => jest.restoreAllMocks());

describe('policy read execution access boundary', () => {
  it('rejects an overridden workflow space before building the policy service', async () => {
    const service = createServiceMock();
    service.getPolicy.mockResolvedValue({
      policy: { id: 'policy-1', name: 'Policy', revision: 1, version: 'version-1' },
      normalizedConfig: {},
      normalizedHash: 'hash',
    });
    const context = createContext({ idOrName: 'policy-1' });
    jest.mocked(context.contextManager.getContext).mockReturnValue({
      workflow: { spaceId: 'overridden' },
    } as never);
    const step = createGetEndpointPolicyStepDefinition(createMockEndpointAppContextService());

    await expect(step.handler(context)).rejects.toThrow(
      'workflow.spaceId does not match the execution space'
    );
    expect(services.createEndpointPolicyManagementService).not.toHaveBeenCalled();
    expect(service.getPolicy).not.toHaveBeenCalled();
    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/internal/spaces/_active_space',
    });
  });

  it('uses fake-request grants and execution-space Fleet scoping, including inaccessible IDs', async () => {
    const app = createMockEndpointAppContextService();
    const request = httpServerMock.createKibanaRequest();
    const fleet = app.getInternalFleetServices();
    app.getInternalFleetServices.mockClear();
    const getPolicy = jest.spyOn(fleet.packagePolicy, 'get');
    getPolicy.mockResolvedValue(
      new FleetPackagePolicyGenerator().generateEndpointPackagePolicy({
        id: 'policy-1',
        version: 'version-1',
      })
    );
    const ensureSpace = jest.spyOn(fleet, 'ensureInCurrentSpace');
    ensureSpace.mockResolvedValue(undefined);
    const scopedClient = jest.spyOn(app.savedObjects, 'createRequestScopedSoClient');
    const step = createGetEndpointPolicyStepDefinition(app);
    const context = createContext({ idOrName: 'policy-1' }, request);

    app.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canReadPolicyManagement: false })
    );
    const denied = await step.handler(context);
    expect(denied.output).toMatchObject({ status: 'error', error: 'not_authorized' });
    expect(denied.output?.result).toBeUndefined();
    expect(getPolicy).not.toHaveBeenCalled();
    expect(app.getEndpointAuthz).toHaveBeenCalledWith(request);

    app.getEndpointAuthz.mockResolvedValue(
      getEndpointAuthzInitialStateMock({
        canReadPolicyManagement: true,
        canReadSecuritySolution: false,
      })
    );
    const allowed = await step.handler(context);
    expect(allowed.output).toMatchObject({
      status: 'success',
      result: { policy: { id: 'policy-1' } },
    });
    expect(app.getInternalFleetServices).toHaveBeenCalledWith('marketing');
    expect(scopedClient).toHaveBeenCalledWith({ request, readonly: true });
    expect(ensureSpace).toHaveBeenCalledWith({ integrationPolicyIds: ['policy-1'] });

    ensureSpace.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
    expect((await step.handler(context)).output).toMatchObject({
      status: 'error',
      error: 'not_found',
    });
  });

  it.each([
    { exception: new EndpointAuthorizationError('denied'), error: 'not_authorized' },
    { exception: new PolicyNotFoundError(), error: 'not_found' },
    {
      exception: new PolicyAmbiguousNameError(
        Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: 'N'.repeat(10_000) })),
        100
      ),
      error: 'ambiguous_name',
    },
    {
      exception: new PolicyChangeRejectedError([
        {
          operationIndexes: [0],
          path: 'windows.malware.mode',
          reason: 'invalid_value',
          acceptedValues: { type: 'enum', values: ['off', 'detect', 'prevent'] },
        },
      ]),
      error: 'rejected_operations',
    },
  ])('preserves $error domain details without a success result', async ({ exception, error }) => {
    const service = createServiceMock();
    service.getPolicy.mockRejectedValue(exception);
    const result = (
      await createGetEndpointPolicyStepDefinition(createMockEndpointAppContextService()).handler(
        createContext({ idOrName: 'policy-1' })
      )
    ).output;
    expect(result).toMatchObject({ status: 'error', error, message: expect.any(String) });
    expect(result?.result).toBeUndefined();
    if (exception instanceof PolicyAmbiguousNameError) {
      expect(result).toMatchObject({ candidates_total: 100, candidates_truncated: true });
      expect(result?.candidates).toHaveLength(exception.candidates.length);
      expect(result?.candidates?.[0]).toMatchObject({ id: '0', name_string_truncated: true });
    }
    if (exception instanceof PolicyChangeRejectedError) {
      expect(result).toMatchObject({ rejections: exception.rejections, rejections_total: 1 });
    }
  });
});

it('preserves unverified-write observations through the step error presenter', () => {
  const before = { id: 'policy-1', name: 'Policy', revision: 1, version: 'version-1' };
  const observed = { ...before, revision: 2, version: 'version-2' };
  const error = new PolicyWriteUnverifiedError(before, observed);
  expect(
    presentPolicyStepError(presentPolicyError(error, loggerMock.create(), 'apply'))
  ).toMatchObject({
    status: 'error',
    error: 'write_unverified',
    before,
    observation: 'available',
    observed,
  });
});

describe('policy read output projections', () => {
  const policy = { id: 'policy-1', name: 'Policy', revision: 2, version: 'version-2' };
  const summary = {
    windowsProtectionModes: {
      malware: 'prevent',
      ransomware: 'prevent',
      memoryThreat: 'detect',
      behavior: 'prevent',
    },
    macProtectionModes: { malware: 'prevent', behavior: 'detect' },
    linuxProtectionModes: { malware: 'prevent', ransomware: 'off', behavior: 'detect' },
    globalTelemetryEnabled: true,
  };

  it('parses a policy list with unavailable usage through the step schema', async () => {
    const service = createServiceMock();
    service.listPolicies.mockResolvedValue({
      population: 'endpoint_package_policies',
      page: 1,
      per_page: 20,
      items: [
        {
          ...policy,
          normalizedHash: 'hash',
          posture: summary,
          usage: { classification: 'undetermined', reason: 'requires_endpoint_list_read' },
        },
      ],
      value_total: 1,
      has_more: false,
      invalid_policy_count: 0,
      usage_unavailable: 'requires_endpoint_list_read',
    });
    const step = createListEndpointPoliciesStepDefinition(createMockEndpointAppContextService());
    const { output } = await step.handler(
      createContext({ page: 1, perPage: 20, includeEndpointUsage: true })
    );
    expect(step.outputSchema.parse(output)).toEqual({
      status: 'success',
      result: {
        population: 'endpoint_package_policies',
        page: 1,
        per_page: 20,
        items: [
          {
            ...policy,
            normalizedHash: 'd04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa',
            posture: summary,
            usage: { classification: 'undetermined', reason: 'requires_endpoint_list_read' },
          },
        ],
        value_total: 1,
        has_more: false,
        invalid_policy_count: 0,
        usage_unavailable: 'requires_endpoint_list_read',
      },
    });

    const invalidInput = {
      page: 1,
      perPage: 20,
      includeEndpointUsage: false,
      includeUsage: true,
    };
    await expect(step.handler(createContext(invalidInput))).rejects.toMatchObject({
      type: 'ValidationError',
      message: expect.stringContaining('includeUsage'),
    });
    expect(service.listPolicies).toHaveBeenCalledTimes(1);
  });

  it('parses a deployment baseline with unresolved telemetry through the step schema', async () => {
    const service = createServiceMock();
    const environment = { license: 'platinum', cloud: true, telemetryOptedIn: 'unresolved' };
    service.getPolicyBaseline.mockResolvedValue({
      kind: 'baseline',
      preset: 'EDRComplete',
      environment,
      normalizedConfig: { global_telemetry_enabled: true },
      normalizedHash: 'hash',
      summary,
    });
    const step = createGetEndpointPolicyBaselineStepDefinition(
      createMockEndpointAppContextService()
    );
    const { output } = await step.handler(createContext({ preset: 'EDRComplete' }));
    expect(step.outputSchema.parse(output)).toEqual({
      status: 'success',
      result: {
        baseline: { type: 'baseline', preset: 'EDRComplete', environment },
        normalizedHash: 'd04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa',
        summary,
        config: { global_telemetry_enabled: true },
      },
    });
  });

  it('parses both incomplete rollout populations through the step schema', async () => {
    const service = createServiceMock();
    service.getPolicyRolloutStatus.mockResolvedValue({
      policy,
      spaceId: 'marketing',
      revisionCoverage: {
        outOfDateHosts: 2,
        classifiedHosts: 3,
        undeterminedHosts: 1,
        unclassifiedOverflowHosts: 4,
        truncated: true,
        source: 'united_metadata_tuple_aggregation',
        population:
          'readable_united_endpoint_hosts_canonical_assignment_matches_target_agent_policy_ids',
      },
      currentRevisionResponses: {
        needsAttentionHosts: 5,
        classifiedHosts: 6,
        undeterminedHosts: 7,
        upstreamUnclassifiedHosts: 8,
        truncated: true,
        source: 'policy_response_latest_per_agent',
        population:
          'latest_policy_responses_for_assignment_matched_agents_at_current_package_revision',
        responseCoverageIncomplete: true,
      },
    });
    const step = createGetEndpointPolicyRolloutStatusStepDefinition(
      createMockEndpointAppContextService()
    );
    const { output } = await step.handler(createContext({ idOrName: policy.id }));
    expect(step.outputSchema.parse(output)).toEqual({
      status: 'success',
      result: {
        policy: { id: policy.id, name: policy.name, revision: policy.revision },
        spaceId: 'marketing',
        revision_coverage: {
          out_of_date_hosts: 2,
          classified_hosts: 3,
          undetermined_hosts: 1,
          unclassified_overflow_hosts: 4,
          truncated: true,
          source: 'united_metadata_tuple_aggregation',
          population:
            'readable_united_endpoint_hosts_canonical_assignment_matches_target_agent_policy_ids',
        },
        current_revision_responses: {
          needs_attention_hosts: 5,
          classified_hosts: 6,
          undetermined_hosts: 7,
          upstream_unclassified_hosts: 8,
          truncated: true,
          source: 'policy_response_latest_per_agent',
          population:
            'latest_policy_responses_for_assignment_matched_agents_at_current_package_revision',
          response_coverage_incomplete: true,
        },
      },
    });
  });
});

describe('bounded policy workflow output', () => {
  it('caps field-reference evidence and reports trimming without corrupting accepted values', async () => {
    const service = createServiceMock();
    const step = createGetEndpointPolicyFieldReferenceStepDefinition(
      createMockEndpointAppContextService()
    );
    service.getPolicyFieldReference.mockResolvedValue({
      found: true,
      match: 'exact',
      path: 'windows.malware.mode',
      writable: true,
      acceptedValues: { type: 'enum', values: ['off', 'detect', 'prevent'] },
      documentationAvailability: 'present',
      longFormGuidance: 'not_retrieved_by_this_tool',
      entry: {
        ...getRegistryEntry(),
        documentation: 'D'.repeat(250_000),
        defaultValue: Array.from({ length: 1_000 }, () => 'V'.repeat(10_000)),
      },
    });
    const result = await step.handler(
      createContext({ selector: { path: 'windows.malware.mode' } })
    );
    expect(result.output).toMatchObject({
      status: 'success',
      result: { acceptedValues: { values: ['off', 'detect', 'prevent'] } },
      truncation: { entries: expect.any(Array) },
    });
    expect(estimateTokens(JSON.stringify(result))).toBeLessThanOrEqual(12_000);
    service.getPolicyFieldReference.mockResolvedValue({
      found: true,
      match: 'search',
      keywords: ['malware'],
      results: Array.from({ length: 20 }, () => ({
        path: 'windows.malware.mode',
        os: ['windows'],
        writable: true,
      })),
      results_total: 20,
      results_truncated: false,
    });
    const search = (await step.handler(createContext({ selector: { keywords: ['malware'] } })))
      .output;
    expect(search?.result?.results).toHaveLength(10);
    expect(search?.result?.results_truncated).toBe(true);
  });

  it('keeps oversized get, compare and assess envelopes within 16000 tokens', async () => {
    const service = createServiceMock();
    const app = createMockEndpointAppContextService();
    const policy = {
      id: 'policy-1',
      name: 'N'.repeat(10_000),
      description: 'D'.repeat(10_000),
      revision: 1,
      version: 'version-1',
    };
    const config = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [
        `field_${index}`,
        Array.from({ length: 60 }, () => 'V'.repeat(1_024)),
      ])
    );
    const side = {
      kind: 'policy',
      policy,
      normalizedConfig: config,
      normalizedHash: 'hash',
      storedConfig: config,
    };
    const diffs = Array.from({ length: 100 }, (_, index) => ({
      path: `field_${index}`,
      from: Array.from({ length: 60 }, () => 'F'.repeat(1_024)),
      to: Array.from({ length: 60 }, () => 'T'.repeat(1_024)),
    }));
    service.getPolicy.mockResolvedValue(side);
    service.comparePolicies.mockResolvedValue({ from: side, to: side, diffs });
    const changes = Array.from({ length: 50 }, () => ({
      op: 'set_field' as const,
      path: 'windows.malware.mode',
      value: 'V'.repeat(1_200),
    }));
    const facts = Array.from({ length: 100 }, (_, index) => ({
      ...diffs[index],
      path: 'windows.malware.mode',
      origin: { kind: 'direct', operationIndex: index % 50, op: 'set_field' },
      registry: getRegistryEntry(),
      eligibility: { eligible: true },
    }));
    service.assessPolicyChange.mockResolvedValue({
      spaceId: 'marketing',
      assessment: {
        policy: { snapshot: { identity: policy } },
        requestedOperations: changes,
        changes: facts,
        normalizedDiff: diffs,
        sideEffects: facts.map((fact) => ({ ...fact, reason: 'derived_field_update' })),
        globalBlockers: Array.from({ length: 100 }, () => ({ reason: 'blocked' })),
        advisories: [],
      },
      enrollment: {
        population: 'enrolled_agents',
        source: 'fleet_status_aggregation',
        status: { all: 10_000 },
      },
    });
    const outputs = {
      get: await createGetEndpointPolicyStepDefinition(app).handler(
        createContext({ idOrName: 'policy-1' })
      ),
      compare: await createCompareEndpointPoliciesStepDefinition(app).handler(
        createContext({ from: { idOrName: 'policy-1' }, to: { preset: 'EDRComplete' } })
      ),
      assess: await createAssessEndpointPolicyChangeStepDefinition(app).handler(
        createContext({ idOrName: 'policy-1', changes })
      ),
    };
    for (const output of Object.values(outputs)) {
      expect(output.output?.status).toBe('success');
      const tokens = estimateTokens(JSON.stringify(output));
      expect(tokens).toBeLessThanOrEqual(16_000);
    }
    expect(outputs.get.output?.result).toHaveProperty('config_truncation');
    expect(outputs.compare.output?.result?.value_truncated).toBe(true);
    expect(outputs.assess.output?.result?.expanded_changes_value_truncated).toBe(true);
  });
});
