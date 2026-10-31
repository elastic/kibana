/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { UnhealthyReason } from '@kbn/fleet-plugin/common/types';
import { ExceptionListOsType } from '@kbn/securitysolution-exceptions-common/api';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  ENVELOPE_TOKEN_BUDGET,
  EXCERPT_MAX_CHARS,
  MAX_INPUT_STRING_CHARS,
} from '../../../../../../common/workflows/step_types/common/budget';
import {
  SUMMARY_DESCRIPTION_MAX_CHARS,
  SUMMARY_NAME_MAX_CHARS,
  SUMMARY_POLICY_IDS_MAX,
  SUMMARY_TAG_MAX_CHARS,
  SUMMARY_TAGS_MAX,
  artifactItemSchema,
  findEndpointArtifactsInputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/artifacts';
import {
  MAX_DIAGNOSTIC_COMPONENTS,
  MAX_DIAGNOSTIC_UNITS,
  MAX_HOST_IPS,
  MAX_HOST_RECORDS,
  MAX_POLICY_ACTIONS,
} from '../../../../../../common/workflows/step_types/endpoint/hosts';
import {
  MAX_PACKAGE_INDICES,
  MAX_PACKAGE_PIPELINES,
  MAX_PACKAGE_TRANSFORMS,
} from '../../../../../../common/workflows/step_types/endpoint/package';
import { finalizeTroubleshootingDiagnosisInputSchema } from '../../../../../../common/workflows/step_types/endpoint/configuration_troubleshooting';
import { createFinalizeTroubleshootingDiagnosisStepDefinition } from './finalize_troubleshooting_diagnosis_step';
import { findEndpointArtifactsStepDefinition } from '../../artifacts/find';

const REFERENCE_ID_LENGTH = 36;
const ISO = '2026-01-01T00:00:00.000Z';

const long = (length: number, character = 'x'): string => character.repeat(length);
const referenceId = (character: string): string => character.repeat(REFERENCE_ID_LENGTH);

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
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.finalizeTroubleshootingDiagnosis',
  } as unknown as StepHandlerContext<unknown, unknown>;
};

const maxHostRecord = () => ({
  agent_id: referenceId('a'),
  endpoint_id: referenceId('e'),
  host_status: 'healthy',
  last_checkin: ISO,
  metadata: {
    agent: { id: referenceId('a'), version: '8.0.0', type: 'endpoint' },
    elastic: { agent: { id: referenceId('a') } },
    host: {
      hostname: referenceId('h'),
      name: referenceId('h'),
      ip: Array.from({ length: MAX_HOST_IPS }, () => referenceId('i')),
      ip_total: MAX_HOST_IPS,
      architecture: 'x86_64',
      os: { name: 'windows', version: '10', platform: 'windows', family: 'windows' },
    },
    Endpoint: {
      status: 'HEALTHY',
      policy: {
        applied: {
          id: referenceId('p'),
          name: referenceId('p'),
          status: 'success',
          endpoint_policy_version: 1,
          version: 1,
        },
      },
      state: { isolation: false },
    },
  },
  policy_info: {
    agent: {
      configured: { id: referenceId('c'), revision: 1 },
      applied: { id: referenceId('p'), revision: 1 },
    },
    endpoint: { id: referenceId('e'), revision: 1 },
  },
  fleet_agent: {
    id: referenceId('f'),
    status: 'healthy',
    active: true,
    enrolled_at: ISO,
    unenrolled_at: ISO,
    last_checkin: ISO,
    policy_id: referenceId('p'),
    policy_revision: 1,
    agent: { version: '8.0.0' },
    local_metadata: {
      host: { hostname: referenceId('h'), name: referenceId('h') },
      os: { name: 'windows', version: '10', platform: 'windows' },
    },
  },
});

const maxDiagnosticsResult = () => ({
  agent_id: referenceId('a'),
  endpoint_id: referenceId('e'),
  agent: {
    id: referenceId('a'),
    status: 'healthy',
    last_checkin: ISO,
    last_checkin_status: 'success',
    last_checkin_message: long(EXCERPT_MAX_CHARS),
    unhealthy_reason: Object.values(UnhealthyReason),
    components: Array.from({ length: MAX_DIAGNOSTIC_COMPONENTS }, (_, componentIndex) => ({
      id: referenceId('c'),
      type: componentIndex === 0 ? 'endpoint' : 'input',
      status: 'FAILED',
      message: long(EXCERPT_MAX_CHARS),
      units: Array.from({ length: MAX_DIAGNOSTIC_UNITS }, () => ({
        id: referenceId('u'),
        type: 'endpoint',
        status: 'FAILED',
        message: long(EXCERPT_MAX_CHARS),
      })),
      units_total: MAX_DIAGNOSTIC_UNITS,
    })),
    components_total: MAX_DIAGNOSTIC_COMPONENTS,
  },
  policy_response: {
    '@timestamp': ISO,
    agent: { id: referenceId('a'), version: '8.0.0' },
    Endpoint: {
      policy: {
        applied: {
          id: referenceId('p'),
          name: referenceId('p'),
          status: 'failure',
          version: 1,
          endpoint_policy_version: 1,
          actions: Array.from({ length: MAX_POLICY_ACTIONS }, () => ({
            name: referenceId('n'),
            status: 'failure',
            message: long(EXCERPT_MAX_CHARS),
          })),
          actions_total: MAX_POLICY_ACTIONS,
        },
      },
    },
  },
  unauthorized: [],
  unavailable: [],
});

const maxPackageOutput = () => ({
  package: {
    name: 'endpoint',
    version: '8.0.0',
    latestVersion: '8.0.0',
    installationInfo: { version: '8.0.0', install_status: 'installed' },
  },
  stale: true,
  configurations: {
    transforms: Array.from({ length: MAX_PACKAGE_TRANSFORMS }, () => ({
      id: referenceId('t'),
      state: 'started',
      reason: 'healthy',
      health: { status: 'green' },
      stats: { documents_processed: 1 },
      frequency: '1m',
      sync: { time: { delay: '60s' } },
      settings: { max_page_search_size: 1 },
      default: {
        frequency: '1m',
        sync: { time: { delay: '60s' } },
        settings: { max_page_search_size: 1 },
      },
      failing: true,
    })),
    transforms_total: MAX_PACKAGE_TRANSFORMS,
    indices: Array.from({ length: MAX_PACKAGE_INDICES }, () => ({
      index: referenceId('i'),
      settings: {
        index: {
          number_of_shards: '1',
          number_of_replicas: '1',
          refresh_interval: '5s',
          default_pipeline: 'pipeline',
          final_pipeline: 'pipeline',
          lifecycle: { name: 'policy' },
        },
      },
    })),
    indices_total: MAX_PACKAGE_INDICES,
    pipelines: Array.from({ length: MAX_PACKAGE_PIPELINES }, () => ({ id: referenceId('p') })),
    pipelines_total: MAX_PACKAGE_PIPELINES,
    nodes: { count: 1, roles: { m: 1, d: 1, i: 1 } },
  },
  unauthorized: [],
  unavailable: [],
});

const maximalDiagnosisInput = {
  resolve: {
    output: {
      results: [
        {
          target: { hostname: referenceId('h') },
          status: 'resolved',
          hosts: Array.from({ length: MAX_HOST_RECORDS }, maxHostRecord),
          truncation: { total: 999, returned: MAX_HOST_RECORDS, truncated: true },
          unauthorized: [],
          unavailable: [],
        },
      ],
    },
  },
  host_diagnostics: { output: { results: [maxDiagnosticsResult()] } },
  package_status: { output: maxPackageOutput() },
  inventory_counts: {
    output: {
      fleet_agent_count: 999,
      united_metadata_count: 999,
      current_metadata_count: 999,
      unauthorized: [],
      unavailable: [],
    },
  },
  target_requested: false,
  include_configurations: true,
  started_at: '2026-01-01T00:00:00',
};

const maxArtifactItem = (index: number) =>
  artifactItemSchema.parse({
    id: referenceId('s'),
    item_id: `${referenceId('i').slice(String(index).length)}${index}`,
    list_id: 'endpoint_trusted_apps',
    type: 'simple',
    namespace_type: 'agnostic',
    _version: long(REFERENCE_ID_LENGTH),
    name: long(SUMMARY_NAME_MAX_CHARS + 1),
    os_types: ExceptionListOsType.options,
    tags: [
      ...Array.from({ length: SUMMARY_TAGS_MAX }, () => long(SUMMARY_TAG_MAX_CHARS + 1)),
      ...Array.from(
        { length: SUMMARY_POLICY_IDS_MAX + 1 },
        (_, policyIndex) =>
          `policy:${referenceId('p').slice(String(policyIndex).length)}${policyIndex}`
      ),
      `ownerSpaceId:${referenceId('o')}`,
    ],
    description: long(SUMMARY_DESCRIPTION_MAX_CHARS + 1),
    entries: Array.from({ length: 6 }, () => ({
      field: 'process.executable',
      type: 'match',
      operator: 'included',
      value: long(MAX_INPUT_STRING_CHARS),
    })),
    comments: [],
    tie_breaker_id: referenceId('t'),
    created_at: ISO,
    created_by: 'elastic',
    updated_at: ISO,
    updated_by: 'elastic',
  });

describe('At configuration troubleshooting envelope budget', () => {
  it('keeps a maximal diagnose projection under ENVELOPE_TOKEN_BUDGET', async () => {
    const { output } = await createFinalizeTroubleshootingDiagnosisStepDefinition({
      analytics: { reportEvent: jest.fn() },
    }).handler(createMockContext(maximalDiagnosisInput));

    expect(output).toBeDefined();
    expect(estimateTokens(output)).toBeLessThan(ENVELOPE_TOKEN_BUDGET);
  });

  it('keeps a maximal find projection at limit 20 under ENVELOPE_TOKEN_BUDGET', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: {
        data: Array.from({ length: 20 }, (_, index) => maxArtifactItem(index)),
        page: 1,
        per_page: 100,
        total: 20,
      },
    });
    const input = findEndpointArtifactsInputSchema.parse({
      list_id: 'endpoint_trusted_apps',
      limit: 20,
    });
    const { output } = await findEndpointArtifactsStepDefinition.handler({
      input,
      contextManager: { callKibanaApi },
    } as unknown as StepHandlerContext<typeof findEndpointArtifactsInputSchema>);

    expect(output?.summaries).toHaveLength(20);
    const projection = {
      summaries: output?.summaries,
      population: output?.population,
      unauthorized: output?.unauthorized,
    };

    expect(estimateTokens(projection)).toBeLessThan(ENVELOPE_TOKEN_BUDGET);
  });
});
