/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ErrorResultData } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  BuiltInToolConfirmationPolicy,
  ToolHandlerContext,
} from '@kbn/agent-builder-server/tools';
import type { StartServicesAccessor } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { z } from '@kbn/zod/v4';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import {
  EndpointAuthorizationError,
  EndpointHttpError,
  NotFoundError as EndpointNotFoundError,
} from '../../../../endpoint/errors';
import { createToolHandlerContext } from '../../../__mocks__/test_helpers';
import {
  DEVICE_POPUP_ENABLED_UNSUPPORTED_MESSAGE,
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  POLICY_CHANGE_SCHEMA_MESSAGE,
  PolicyChangePreparationError,
  nonWritablePathMessage,
  unknownCurrentValueMessage,
} from '../domain/impact';
import type { EndpointPolicyManagementService } from '../services/endpoint_policy_management_service';
import { createEndpointPolicyManagementService } from '../services/endpoint_policy_management_service';
import {
  InvalidEndpointPolicyError,
  POLICY_ERROR_MESSAGES,
  PolicyAmbiguousNameError,
  PolicyBaselineUnavailableError,
  PolicyBlockedChangeError,
  PolicyNoChangeError,
  PolicyNotFoundError,
  PolicyVersionConflictError,
  PolicyWriteRejectedError,
  PolicyWriteUnverifiedError,
} from '../services/policy_errors';
import {
  POLICY_TOOL_ERROR_MESSAGES,
  classifyPolicyError,
  createPolicyTool,
} from './create_policy_tool';

jest.mock('../services/endpoint_policy_management_service', () => ({
  createEndpointPolicyManagementService: jest.fn(),
}));

const SPACE_ID = 'space-marketing';
const TOOL_ID = 'security.policy_management.test_policy_tool';

const WRITE_IDENTITY = {
  id: 'policy-1',
  name: 'Protect marketing',
  revision: 4,
  version: 'WzQsMV0=',
} as const;

const testSchema = z.object({
  idOrName: z.string().min(1).max(256),
});

type TestParams = z.infer<typeof testSchema>;

const createLogger = () => loggingSystemMock.createLogger();

const createContext = (
  logger: ReturnType<typeof loggingSystemMock.createLogger> = createLogger()
): ToolHandlerContext => {
  const request = httpServerMock.createKibanaRequest();
  return createToolHandlerContext(
    request,
    elasticsearchClientMock.createScopedClusterClient(),
    logger,
    { spaceId: SPACE_ID }
  );
};

const createGetStartServices = (): StartServicesAccessor =>
  jest.fn(async () => [
    { savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) } },
  ]) as unknown as StartServicesAccessor;

const mockedCreateEndpointPolicyManagementService = jest.mocked(
  createEndpointPolicyManagementService
);

const getHandlerResult = async (
  run: jest.Mock,
  options: {
    logger?: ReturnType<typeof loggingSystemMock.createLogger>;
    maxResultTokens?: number;
    confirmation?: BuiltInToolConfirmationPolicy<TestParams>;
  } = {}
) => {
  const logger = options.logger ?? createLogger();
  const endpointAppContextService = createMockEndpointAppContextService();
  const getStartServices = createGetStartServices();
  const ctx = createContext(logger);
  const mockService = {
    getPolicy: jest.fn(),
  } as unknown as EndpointPolicyManagementService;
  mockedCreateEndpointPolicyManagementService.mockClear();
  mockedCreateEndpointPolicyManagementService.mockReturnValue(mockService);

  const tool = createPolicyTool({
    endpointAppContextService,
    getStartServices,
    id: TOOL_ID,
    description: 'Test policy tool',
    schema: testSchema,
    maxResultTokens: options.maxResultTokens,
    confirmation: options.confirmation,
    run,
  });
  const result = await tool.handler({ idOrName: 'policy-1' }, ctx);
  if (!('results' in result)) {
    throw new Error('expected a standard tool result');
  }

  return {
    tool,
    ctx,
    result: result.results[0],
    endpointAppContextService,
    getStartServices,
    mockService,
    logger,
  };
};

describe('classifyPolicyError', () => {
  it('classifies local not-found, ambiguous, and invalid errors', () => {
    expect(classifyPolicyError(new PolicyNotFoundError())).toBe('not_found');
    expect(classifyPolicyError(new PolicyAmbiguousNameError([{ id: 'a', name: 'alpha' }], 1))).toBe(
      'ambiguous_name'
    );
    expect(classifyPolicyError(new InvalidEndpointPolicyError())).toBe('invalid_policy');
  });

  it('classifies Endpoint authorization and not-found classes', () => {
    expect(classifyPolicyError(new EndpointAuthorizationError())).toBe('not_authorized');
    expect(classifyPolicyError(new EndpointNotFoundError('missing'))).toBe('not_found');
  });

  it('classifies HTTP 403 and 404 as not_authorized and not_found', () => {
    expect(classifyPolicyError(new EndpointHttpError('forbidden', 403))).toBe('not_authorized');
    expect(classifyPolicyError(new EndpointHttpError('missing', 404))).toBe('not_found');
  });

  it('classifies expected PolicyChangePreparationError codes and ignores raw messages', () => {
    const leakyPath = 'linux.advanced.artifacts.global.channel';
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError(
          POLICY_CHANGE_PREPARATION_ERROR_CODE.non_writable_path,
          nonWritablePathMessage(leakyPath)
        )
      )
    ).toBe('non_writable_path');
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError(
          POLICY_CHANGE_PREPARATION_ERROR_CODE.unsupported_operation,
          DEVICE_POPUP_ENABLED_UNSUPPORTED_MESSAGE
        )
      )
    ).toBe('unsupported_operation');
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError(
          POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
          POLICY_CHANGE_SCHEMA_MESSAGE
        )
      )
    ).toBe('invalid_input');
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError(
          POLICY_CHANGE_PREPARATION_ERROR_CODE.unknown_current_value,
          unknownCurrentValueMessage(leakyPath)
        )
      )
    ).toBe('unknown_current_value');
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError('unknown_code' as 'invalid_input', leakyPath)
      )
    ).toBe('unknown_error');
  });

  it('classifies bad requests and unknown faults as unknown_error, never as not_found', () => {
    expect(classifyPolicyError(new EndpointHttpError('bad request', 400))).toBe('unknown_error');
    expect(classifyPolicyError(new EndpointHttpError('server', 500))).toBe('unknown_error');
    expect(classifyPolicyError(new Error('ECONNREFUSED es.internal.local:9200'))).toBe(
      'unknown_error'
    );
    expect(classifyPolicyError('string error')).toBe('unknown_error');
    expect(classifyPolicyError(new Error(POLICY_ERROR_MESSAGES.baseline_unavailable))).toBe(
      'unknown_error'
    );
    expect(classifyPolicyError(new Error(POLICY_ERROR_MESSAGES.write_unverified))).toBe(
      'unknown_error'
    );
  });
});

describe('createPolicyTool', () => {
  it('creates a builtin tool and forwards optional maxResultTokens', () => {
    const tool = createPolicyTool({
      endpointAppContextService: createMockEndpointAppContextService(),
      getStartServices: createGetStartServices(),
      id: TOOL_ID,
      description: 'Test policy tool',
      schema: testSchema,
      maxResultTokens: 8_000,
      run: async () => ({ ok: true }),
    });

    expect(tool.id).toBe(TOOL_ID);
    expect(tool.maxResultTokens).toBe(8_000);
  });

  it('omits maxResultTokens and confirmation when the caller does not set them', () => {
    const tool = createPolicyTool({
      endpointAppContextService: createMockEndpointAppContextService(),
      getStartServices: createGetStartServices(),
      id: TOOL_ID,
      description: 'Test policy tool',
      schema: testSchema,
      run: async () => ({ ok: true }),
    });

    expect(tool.maxResultTokens).toBeUndefined();
    expect(tool.confirmation).toBeUndefined();
  });

  it('forwards optional confirmation unchanged and does not invoke getConfirmation', async () => {
    const confirmation: BuiltInToolConfirmationPolicy<TestParams> = {
      askUser: 'always',
      getConfirmation: jest.fn(async () => {
        throw new Error('preview failed');
      }),
    };
    const run = jest.fn(async () => ({ ok: true }));
    const { tool, result } = await getHandlerResult(run, { confirmation });

    expect(tool.confirmation).toBe(confirmation);
    expect(confirmation.getConfirmation).not.toHaveBeenCalled();
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({ ok: true });
  });

  it('constructs the request-scoped service from the handler request and spaceId and does not authorize in the wrapper', async () => {
    const run = jest.fn(async () => ({ ok: true }));
    const { result, ctx, endpointAppContextService, getStartServices, mockService } =
      await getHandlerResult(run);

    expect(mockedCreateEndpointPolicyManagementService).toHaveBeenCalledTimes(1);
    expect(mockedCreateEndpointPolicyManagementService).toHaveBeenCalledWith({
      endpointAppContextService,
      getStartServices,
      request: ctx.request,
      spaceId: SPACE_ID,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({ idOrName: 'policy-1' }, mockService, ctx);
    expect(endpointAppContextService.getEndpointAuthz).not.toHaveBeenCalled();
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data).toEqual({ ok: true });
  });

  it.each([
    ['not_authorized', new EndpointAuthorizationError()],
    ['not_found', new PolicyNotFoundError()],
    ['invalid_policy', new InvalidEndpointPolicyError()],
    ['not_found', new EndpointNotFoundError('missing')],
    ['baseline_unavailable', new PolicyBaselineUnavailableError()],
    ['version_conflict', new PolicyVersionConflictError()],
    ['blocked_change', new PolicyBlockedChangeError()],
    ['no_change', new PolicyNoChangeError()],
    ['write_rejected', new PolicyWriteRejectedError()],
  ] as const)(
    'returns a stable %s error result without internals and debug-logs expected faults',
    async (errorClass, thrown) => {
      const logger = createLogger();
      const run = jest.fn(async () => {
        throw thrown;
      });
      const { result } = await getHandlerResult(run, { logger });

      expect(result.type).toBe(ToolResultType.error);
      expect(result.data).toEqual({
        message: POLICY_TOOL_ERROR_MESSAGES[errorClass],
        metadata: { error: errorClass },
      });
      expect(result.data).not.toHaveProperty('stack');
      expect(JSON.stringify(result.data)).not.toMatch(/ECONNREFUSED|stack|canRead|es\.internal/i);
      expect(logger.debug).toHaveBeenCalledWith(`Error in ${TOOL_ID}: ${errorClass}`);
      expect(logger.error).not.toHaveBeenCalled();
    }
  );

  it('includes bounded ambiguous-name candidates in error metadata', async () => {
    const logger = createLogger();
    const overlongName = 'N'.repeat(600);
    const candidates = [
      { id: 'id-0', name: overlongName },
      ...Array.from({ length: 11 }, (_, index) => ({
        id: `id-${index + 1}`,
        name: `name-${index + 1}`,
      })),
    ];
    const run = jest.fn(async () => {
      throw new PolicyAmbiguousNameError(candidates, 12);
    });
    const { result } = await getHandlerResult(run, { logger });

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data).toEqual({
      message: POLICY_TOOL_ERROR_MESSAGES.ambiguous_name,
      metadata: {
        error: 'ambiguous_name',
        candidates: [
          { id: 'id-0', name: 'N'.repeat(512), name_string_truncated: true },
          ...candidates.slice(1, 10).map(({ id, name }) => ({ id, name })),
        ],
        candidates_truncated: true,
        candidates_total: 12,
      },
    });
    expect(logger.debug).toHaveBeenCalledWith(`Error in ${TOOL_ID}: ambiguous_name`);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns write_unverified with unavailable observation when observed is absent', async () => {
    const logger = createLogger();
    const run = jest.fn(async () => {
      throw new PolicyWriteUnverifiedError(WRITE_IDENTITY);
    });
    const { result } = await getHandlerResult(run, { logger });
    const serialized = JSON.stringify(result.data);

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data).toEqual({
      message: POLICY_TOOL_ERROR_MESSAGES.write_unverified,
      metadata: {
        error: 'write_unverified',
        before: WRITE_IDENTITY,
        observation: 'unavailable',
      },
    });
    expect((result.data as ErrorResultData).metadata).not.toHaveProperty('observed');
    expect(serialized).not.toContain('proposedConfig');
    expect(serialized).not.toContain('config');
    expect(logger.debug).toHaveBeenCalledWith(`Error in ${TOOL_ID}: write_unverified`);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns write_unverified with available bounded observed identity and no success claim', async () => {
    const logger = createLogger();
    const overlongName = 'N'.repeat(600);
    const overlongVersion = 'V'.repeat(600);
    const before = {
      id: 'policy-1',
      name: overlongName,
      revision: 4,
      version: 'WzQsMV0=',
    };
    const observed = {
      id: 'policy-1',
      name: overlongName,
      revision: 5,
      version: overlongVersion,
    };
    const run = jest.fn(async () => {
      throw new PolicyWriteUnverifiedError(before, observed);
    });
    const { result } = await getHandlerResult(run, { logger });
    const serialized = JSON.stringify(result.data);

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data).toEqual({
      message: POLICY_TOOL_ERROR_MESSAGES.write_unverified,
      metadata: {
        error: 'write_unverified',
        before: {
          id: 'policy-1',
          name: 'N'.repeat(512),
          name_string_truncated: true,
          revision: 4,
          version: 'WzQsMV0=',
        },
        observation: 'available',
        observed: {
          id: 'policy-1',
          name: 'N'.repeat(512),
          name_string_truncated: true,
          revision: 5,
          version: 'V'.repeat(512),
          version_string_truncated: true,
        },
      },
    });
    expect(serialized).not.toContain('proposedConfig');
    expect(logger.debug).toHaveBeenCalledWith(`Error in ${TOOL_ID}: write_unverified`);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    [
      'non_writable_path',
      new PolicyChangePreparationError(
        POLICY_CHANGE_PREPARATION_ERROR_CODE.non_writable_path,
        nonWritablePathMessage('linux.advanced.artifacts.global.channel')
      ),
      ['linux.advanced.artifacts.global.channel', 'Path is not a writable policy field'],
    ],
    [
      'unsupported_operation',
      new PolicyChangePreparationError(
        POLICY_CHANGE_PREPARATION_ERROR_CODE.unsupported_operation,
        DEVICE_POPUP_ENABLED_UNSUPPORTED_MESSAGE
      ),
      ['device_control.enabled'],
    ],
    [
      'invalid_input',
      new PolicyChangePreparationError(
        POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
        POLICY_CHANGE_SCHEMA_MESSAGE
      ),
      [],
    ],
    [
      'unknown_current_value',
      new PolicyChangePreparationError(
        POLICY_CHANGE_PREPARATION_ERROR_CODE.unknown_current_value,
        unknownCurrentValueMessage('windows.advanced.malware.mode')
      ),
      ['windows.advanced.malware.mode', 'current value is not present in the live policy'],
    ],
  ] as const)(
    'returns a canned %s refusal without raw preparation text or paths and debug-logs it',
    async (errorClass, thrown, leakedFragments) => {
      const logger = createLogger();
      const run = jest.fn(async () => {
        throw thrown;
      });
      const { result } = await getHandlerResult(run, { logger });
      const serialized = JSON.stringify(result.data);

      expect(result.type).toBe(ToolResultType.error);
      expect(result.data).toEqual({
        message: POLICY_TOOL_ERROR_MESSAGES[errorClass],
        metadata: { error: errorClass },
      });
      expect(result.data).not.toHaveProperty('stack');
      expect(serialized).not.toContain(thrown.message);
      for (const fragment of leakedFragments) {
        expect(serialized).not.toContain(fragment);
      }
      expect(logger.debug).toHaveBeenCalledWith(`Error in ${TOOL_ID}: ${errorClass}`);
      expect(logger.error).not.toHaveBeenCalled();
    }
  );

  it('error-logs unknown faults and returns a stable non-sensitive message', async () => {
    const logger = createLogger();
    const run = jest.fn(async () => {
      throw new Error('ECONNREFUSED es.internal.local:9200 secret-token');
    });
    const { result } = await getHandlerResult(run, { logger });

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data).toEqual({
      message: POLICY_TOOL_ERROR_MESSAGES.unknown_error,
      metadata: { error: 'unknown_error' },
    });
    expect(result.data).not.toHaveProperty('stack');
    expect(JSON.stringify(result.data)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(result.data)).not.toContain('secret-token');
    expect(JSON.stringify(result.data)).not.toContain('es.internal.local');
    expect(logger.error).toHaveBeenCalledWith(
      `Error in ${TOOL_ID}: ECONNREFUSED es.internal.local:9200 secret-token`
    );
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
