/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { StartServicesAccessor } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { policyFactory } from '../../../../../common/endpoint/models/policy_config';
import { ProtectionModes } from '../../../../../common/endpoint/types';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { createToolHandlerContext } from '../../../__mocks__/test_helpers';
import { createEndpointPolicySnapshot } from '../domain/endpoint_policy_snapshot';
import { buildPolicyChangeAssessment } from '../domain/impact';
import type { PolicyChangeCapabilities } from '../domain/impact';
import { normalizeEndpointPolicy } from '../domain/normalized_endpoint_policy';
import type {
  ApplyPolicyChangePreview,
  ApplyPolicyChangeResult,
} from '../services/apply_policy_change';
import type { EndpointCountResult } from '../services/count_endpoints';
import type { EndpointPolicyManagementService } from '../services/endpoint_policy_management_service';
import { createEndpointPolicyManagementService } from '../services/endpoint_policy_management_service';
import { POLICY_TOOL_ERROR_MESSAGES } from './create_policy_tool';
import { renderApplyPolicyChangeConfirmation } from './apply_policy_change_confirmation';
import { presentApplyPolicyChangeResult } from './present_apply_policy_change_result';
import {
  APPLY_POLICY_CHANGE_TOOL_ID,
  applyPolicyChangeSchema,
  createApplyPolicyChangeTool,
} from './apply_policy_change';
import type { ApplyPolicyChangeInput } from './apply_policy_change';
import { PolicyVersionConflictError, PolicyWriteRejectedError } from '../services/policy_errors';

jest.mock('../services/endpoint_policy_management_service', () => ({
  createEndpointPolicyManagementService: jest.fn(),
}));

jest.mock('./apply_policy_change_confirmation', () => {
  const actual = jest.requireActual('./apply_policy_change_confirmation');
  return {
    ...actual,
    renderApplyPolicyChangeConfirmation: jest.fn(actual.renderApplyPolicyChangeConfirmation),
  };
});

const mockedCreateEndpointPolicyManagementService = jest.mocked(
  createEndpointPolicyManagementService
);
const mockedRenderApplyPolicyChangeConfirmation = jest.mocked(renderApplyPolicyChangeConfirmation);

const POLICY_ID = 'policy-1';
const SPACE_ID = 'space-marketing';
const IDENTITY = {
  id: POLICY_ID,
  name: 'Protect marketing',
  revision: 4,
  version: 'WzQsMV0=',
} as const;

const ENROLLMENT: EndpointCountResult = {
  population: 'enrolled_agents',
  source: 'fleet_status_aggregation',
  status: { all: 7 },
};

const generator = new FleetPackagePolicyGenerator();

const capabilities = (): PolicyChangeCapabilities => ({
  licenseInformation: licenseMock.createLicense({ license: { type: 'enterprise' } }),
  endpointPolicyProtections: true,
  endpointTrustedDevices: true,
  trustedDevicesExperimental: true,
  endpointProtectionUpdates: true,
  endpointCustomNotification: true,
  serverless: false,
});

const createPreview = (): ApplyPolicyChangePreview => {
  const packagePolicy = generator.generateEndpointPackagePolicy({
    id: IDENTITY.id,
    name: IDENTITY.name,
    revision: IDENTITY.revision,
    version: IDENTITY.version,
    policy_ids: ['agent-policy-a'],
  });
  const entry = packagePolicy.inputs[0]?.config?.policy;
  if (entry == null) {
    throw new Error('expected generated endpoint package policy to include config.policy');
  }
  entry.value = policyFactory();
  const normalized = normalizeEndpointPolicy(createEndpointPolicySnapshot(packagePolicy));
  const assessment = buildPolicyChangeAssessment(
    normalized,
    [{ op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect }],
    capabilities()
  );

  return {
    policy: {
      id: normalized.snapshot.identity.id,
      name: normalized.snapshot.identity.name,
      revision: normalized.snapshot.identity.revision,
      version: normalized.snapshot.identity.version,
    },
    agentPolicyCount: 1,
    assessment,
    enrollment: ENROLLMENT,
  };
};

const createApplyResult = (): ApplyPolicyChangeResult => ({
  before: IDENTITY,
  after: { ...IDENTITY, revision: 5 },
  appliedChanges: [],
  sideEffects: [],
  residual: [],
  enrollment: ENROLLMENT,
});

const applyParams = (): ApplyPolicyChangeInput => ({
  idOrName: POLICY_ID,
  changes: [{ op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect }],
  expectedVersion: IDENTITY.version,
});

type CallSource = ToolHandlerContext['callContext']['callSource'];

const createContext = (callSource?: CallSource): ToolHandlerContext => {
  const request = httpServerMock.createKibanaRequest();
  const ctx = createToolHandlerContext(
    request,
    elasticsearchClientMock.createScopedClusterClient(),
    loggingSystemMock.createLogger(),
    { spaceId: SPACE_ID }
  );
  (ctx.callContext as { callSource?: CallSource }).callSource = callSource;
  return ctx;
};

const createGetStartServices = (): StartServicesAccessor =>
  jest.fn(async () => [
    { savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) } },
  ]) as unknown as StartServicesAccessor;

const createTool = () =>
  createApplyPolicyChangeTool({
    endpointAppContextService: createMockEndpointAppContextService(),
    getStartServices: createGetStartServices(),
  });

type MockedApplyService = jest.Mocked<
  Pick<EndpointPolicyManagementService, 'previewApplyPolicyChange' | 'applyPolicyChange'>
>;

const withMockedService = <T>(run: (service: MockedApplyService) => T): T => {
  const service = {
    previewApplyPolicyChange: jest.fn(),
    applyPolicyChange: jest.fn(),
  } as unknown as MockedApplyService;
  mockedCreateEndpointPolicyManagementService.mockClear();
  mockedCreateEndpointPolicyManagementService.mockReturnValue(
    service as unknown as EndpointPolicyManagementService
  );
  return run(service);
};

const callConfirmation = async (tool: ReturnType<typeof createTool>, ctx: ToolHandlerContext) =>
  tool.confirmation!.getConfirmation!({
    toolParams: applyParams(),
    context: ctx,
  });

const getStandardResult = async (
  tool: ReturnType<typeof createTool>,
  params: ApplyPolicyChangeInput,
  ctx: ToolHandlerContext
) => {
  const handlerResult = await tool.handler(params, ctx);
  if (!('results' in handlerResult)) {
    throw new Error('expected a standard tool result');
  }
  return handlerResult.results[0];
};

describe('applyPolicyChangeSchema', () => {
  const changes = [{ op: 'set_field' as const, path: 'windows.malware.mode', value: 'prevent' }];

  it('preserves opaque expectedVersion tokens without trimming and enforces bare length bounds', () => {
    const token = '  WzQsMV0=  ';

    expect(
      applyPolicyChangeSchema.parse({
        idOrName: POLICY_ID,
        changes,
        expectedVersion: token,
      }).expectedVersion
    ).toBe(token);

    expect(
      applyPolicyChangeSchema.parse({
        idOrName: POLICY_ID,
        changes,
        expectedVersion: 'x'.repeat(512),
      }).expectedVersion
    ).toHaveLength(512);

    expect(() =>
      applyPolicyChangeSchema.parse({ idOrName: POLICY_ID, changes, expectedVersion: '' })
    ).toThrow();
    expect(() =>
      applyPolicyChangeSchema.parse({
        idOrName: POLICY_ID,
        changes,
        expectedVersion: 'x'.repeat(513),
      })
    ).toThrow();
  });
});

describe('createApplyPolicyChangeTool', () => {
  it('exports the unregistered builtin tool with the confirm budget and always confirmation', () => {
    const tool = createTool();

    expect(tool.id).toBe(APPLY_POLICY_CHANGE_TOOL_ID);
    expect(tool.type).toBe('builtin');
    expect(tool.maxResultTokens).toBe(12_000);
    expect(tool.confirmation!.askUser).toBe('always');
    expect(typeof tool.confirmation!.getConfirmation).toBe('function');
  });

  describe('getConfirmation', () => {
    it('returns the rendered confirmation definition only after a successful preview', async () => {
      await withMockedService(async (service) => {
        const preview = createPreview();
        service.previewApplyPolicyChange.mockResolvedValue(preview);
        const tool = createTool();
        const ctx = createContext('agent');

        const definition = await callConfirmation(tool, ctx);

        expect(mockedCreateEndpointPolicyManagementService).toHaveBeenCalledWith(
          expect.objectContaining({ request: ctx.request, spaceId: ctx.spaceId })
        );
        expect(service.previewApplyPolicyChange).toHaveBeenCalledTimes(1);
        expect(definition).not.toHaveProperty('id');
        expect(definition.color).toBe('warning');
        expect(definition.title).toBe(
          `Apply ${preview.assessment.changes.length} change(s) to "Protect marketing"?`
        );
        expect(definition.confirm_text).toBe('Apply changes');
        expect(definition.cancel_text).toBe('Cancel');
        expect(definition.message).toContain(
          'Checked policy revision 4, version WzQsMV0= against the assessment.'
        );
        expect(definition.message).toContain(
          'Differences between the proposal and the policy Fleet returns are reported after apply.'
        );
      });
    });

    it('propagates preview preparation failures without returning a definition', async () => {
      await withMockedService(async (service) => {
        const preparationError = new PolicyVersionConflictError();
        service.previewApplyPolicyChange.mockRejectedValue(preparationError);
        const tool = createTool();
        mockedRenderApplyPolicyChangeConfirmation.mockClear();

        await expect(callConfirmation(tool, createContext('agent'))).rejects.toBe(preparationError);
        expect(mockedRenderApplyPolicyChangeConfirmation).not.toHaveBeenCalled();
      });
    });

    it('propagates render failures without returning a definition', async () => {
      await withMockedService(async (service) => {
        service.previewApplyPolicyChange.mockResolvedValue(createPreview());
        const renderError = new Error('render failed');
        mockedRenderApplyPolicyChangeConfirmation.mockImplementationOnce(() => {
          throw renderError;
        });
        const tool = createTool();

        await expect(callConfirmation(tool, createContext('agent'))).rejects.toBe(renderError);
      });
    });
  });

  describe('handler', () => {
    it('applies with the actual agent call source and returns the presented result', async () => {
      await withMockedService(async (service) => {
        const applyResult = createApplyResult();
        service.applyPolicyChange.mockResolvedValue(applyResult);
        const tool = createTool();
        const ctx = createContext('agent');
        const params = applyParams();
        const result = await getStandardResult(tool, params, ctx);

        expect(service.applyPolicyChange).toHaveBeenCalledWith(params, { callSource: 'agent' });
        expect(result.type).toBe(ToolResultType.other);
        expect(result.data).toEqual(presentApplyPolicyChangeResult(applyResult));
      });
    });

    it.each([
      ['missing', undefined],
      ['user', 'user'],
      ['mcp', 'mcp'],
      ['unknown', 'unknown'],
    ] as const)(
      'refuses a %s call source with write_rejected before any service write or preview',
      async (_name, callSource) => {
        await withMockedService(async (service) => {
          const tool = createTool();
          const ctx = createContext(callSource);

          const result = await getStandardResult(tool, applyParams(), ctx);

          expect(result.type).toBe(ToolResultType.error);
          expect(result.data).toEqual({
            message: POLICY_TOOL_ERROR_MESSAGES.write_rejected,
            metadata: { error: 'write_rejected' },
          });
          expect(service.applyPolicyChange).not.toHaveBeenCalled();
          expect(service.previewApplyPolicyChange).not.toHaveBeenCalled();
        });
      }
    );

    it('surfaces apply failures as typed policy error results through the factory', async () => {
      await withMockedService(async (service) => {
        const rejection = new PolicyWriteRejectedError();
        service.applyPolicyChange.mockRejectedValue(rejection);
        const tool = createTool();
        const ctx = createContext('agent');

        const result = await getStandardResult(tool, applyParams(), ctx);

        expect(result.type).toBe(ToolResultType.error);
        expect(result.data).toEqual({
          message: POLICY_TOOL_ERROR_MESSAGES.write_rejected,
          metadata: { error: 'write_rejected' },
        });
      });
    });
  });
});
