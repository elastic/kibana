/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../../__mocks__/test_helpers';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { updateTranslatedRuleTool } from './update_translated_rule_tool';
import { SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT } from '../../../../../common/siem_migrations/tool_events';

const mockProductFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

const MIGRATION_ID = 'migration-abc';
const RULE_ID = 'rule-123';

const validInput = {
  migration_id: MIGRATION_ID,
  rule_id: RULE_ID,
  esql_query: 'FROM logs-* | WHERE event.action == "login"',
  comment: 'Updated the ES|QL query to fix field reference.',
};

/** Default mock current rule — not installed, no prebuilt match */
const mockCurrentRule = {
  id: RULE_ID,
  comments: [],
  original_rule: {
    id: 'orig-1',
    vendor: 'splunk',
    title: 'Original Rule Title',
    description: 'Original rule description',
    query: 'search index=main',
    query_language: 'spl',
  },
  elastic_rule: {},
};

/** Helper: build a GET response resolving to the given rule */
const makeGetResponse = (rule: object) => ({
  fetchOptions: {},
  request: new Request('http://localhost/x'),
  response: new Response(null, { status: 200 }),
  body: { data: [rule], total: 1 },
});

/** Helper: build a successful PATCH response */
const makePatchResponse = () => ({
  fetchOptions: {},
  request: new Request('http://localhost/x'),
  response: new Response(null, { status: 200 }),
  body: null,
});

describe('updateTranslatedRuleTool', () => {
  const {
    mockCore,
    mockLogger,
    mockEsClient,
    mockSecurityStart,
    mockCheckPrivileges,
    mockRequest,
  } = createToolTestMocks();
  let mockFetch: jest.Mock;

  const tool = updateTranslatedRuleTool(mockCore, mockLogger, mockProductFeaturesService);

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient, mockSecurityStart);
    (mockCoreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({
      fetch: mockFetch,
    });
  });

  describe('on success', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce(makeGetResponse(mockCurrentRule));
      mockFetch.mockResolvedValueOnce(makePatchResponse());
    });

    it('returns { ok: true } and emits the tool UI event', async () => {
      const sendUiEvent = jest.fn();
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
        events: { reportProgress: jest.fn(), sendUiEvent },
      });

      const result = (await tool.handler(validInput, context)) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect((result.results[0].data as { ok: boolean }).ok).toBe(true);
      expect(sendUiEvent).toHaveBeenCalledTimes(1);
      expect(sendUiEvent).toHaveBeenCalledWith(SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT, {
        migrationId: MIGRATION_ID,
        ruleId: RULE_ID,
      });
    });
  });

  it('does NOT emit the event when privileges are missing', async () => {
    mockCheckPrivileges.mockResolvedValueOnce({ hasAllRequested: false });
    const sendUiEvent = jest.fn();
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      events: { reportProgress: jest.fn(), sendUiEvent },
    });

    const result = (await tool.handler(validInput, context)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });

  it('does NOT emit the event when the rule is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      fetchOptions: {},
      request: new Request('http://localhost/x'),
      response: new Response(null, { status: 200 }),
      body: { data: [], total: 0 },
    });
    const sendUiEvent = jest.fn();
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      events: { reportProgress: jest.fn(), sendUiEvent },
    });

    const result = (await tool.handler(validInput, context)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });

  it('does NOT emit the event when the PATCH fails', async () => {
    mockFetch.mockResolvedValueOnce(makeGetResponse(mockCurrentRule));
    // PATCH fails — simulate HttpSelfFetchError
    const error = new Error('Conflict') as Error & { response?: Response; body?: unknown };
    error.name = 'HttpSelfFetchError';
    error.response = new Response(null, { status: 409 });
    error.body = { message: 'Version conflict' };
    mockFetch.mockRejectedValueOnce(error);

    const sendUiEvent = jest.fn();
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      events: { reportProgress: jest.fn(), sendUiEvent },
    });

    const result = (await tool.handler(validInput, context)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });

  it('rejects input when neither esql_query, prebuilt_rule nor integration_ids is provided', async () => {
    // GET now runs before the dispatch check, so it must be mocked.
    mockFetch.mockResolvedValueOnce(makeGetResponse(mockCurrentRule));

    const sendUiEvent = jest.fn();
    const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
      events: { reportProgress: jest.fn(), sendUiEvent },
    });
    const { esql_query: _, ...inputWithoutMutation } = validInput;

    const result = (await tool.handler(
      inputWithoutMutation,
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(sendUiEvent).not.toHaveBeenCalled();
  });

  describe('installed-rule guard', () => {
    const installedRule = {
      ...mockCurrentRule,
      elastic_rule: { id: 'installed-detection-rule-id', title: 'Some Installed Rule' },
    };

    it('returns an error and does NOT PATCH or emit when rule is installed (esql path)', async () => {
      mockFetch.mockResolvedValueOnce(makeGetResponse(installedRule));
      const sendUiEvent = jest.fn();
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
        events: { reportProgress: jest.fn(), sendUiEvent },
      });

      const result = (await tool.handler(validInput, context)) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0].data as { message: string }).message).toContain('already installed');
      // Only the GET call was made — no PATCH
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(sendUiEvent).not.toHaveBeenCalled();
    });

    it('returns an error and does NOT PATCH or emit when rule is installed (prebuilt path)', async () => {
      mockFetch.mockResolvedValueOnce(makeGetResponse(installedRule));
      const sendUiEvent = jest.fn();
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
        events: { reportProgress: jest.fn(), sendUiEvent },
      });

      const prebuiltInput = {
        migration_id: MIGRATION_ID,
        rule_id: RULE_ID,
        prebuilt_rule: { id: 'some-prebuilt-uuid', title: 'Some Prebuilt Rule' },
        comment: 'Switching to prebuilt.',
      };

      const result = (await tool.handler(prebuiltInput, context)) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0].data as { message: string }).message).toContain('already installed');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(sendUiEvent).not.toHaveBeenCalled();
    });
  });

  describe('ES|QL update on a prebuilt-matched rule', () => {
    it('sends prebuilt_rule_id: null and the original title in the PATCH body', async () => {
      const prebuiltMatchedRule = {
        ...mockCurrentRule,
        elastic_rule: { prebuilt_rule_id: 'some-prebuilt-uuid', title: 'Prebuilt Rule Title' },
      };
      mockFetch.mockResolvedValueOnce(makeGetResponse(prebuiltMatchedRule));
      mockFetch.mockResolvedValueOnce(makePatchResponse());

      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
        events: { reportProgress: jest.fn(), sendUiEvent: jest.fn() },
      });

      await tool.handler(validInput, context);

      // Second call is the PATCH — inspect its body (passed as an object, not JSON string)
      const patchCall = mockFetch.mock.calls[1];
      const patchBody = patchCall[1].body as Array<{ elastic_rule: Record<string, unknown> }>;
      expect(patchBody[0].elastic_rule).toMatchObject({
        prebuilt_rule_id: null,
        title: 'Original Rule Title',
        description: 'Original rule description',
      });
    });
  });
});
