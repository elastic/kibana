/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { allowedExperimentalValues } from '../../../../../../common/experimental_features';
import type { ExperimentalFeatures } from '../../../../../../common/experimental_features';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../../../common/endpoint/service/artifacts/constants';
import { GET_ENDPOINT_ARTIFACTS_TOOL_ID } from '../..';
import { fromKueryExpression } from '@kbn/es-query';
import { getEndpointArtifactsTool, classifyArtifactError, buildArtifactFilter } from '.';

const customYaraSignaturesDisabled: ExperimentalFeatures = {
  ...allowedExperimentalValues,
  customYaraSignaturesEnabled: false,
};

const customYaraSignaturesEnabled: ExperimentalFeatures = {
  ...allowedExperimentalValues,
  customYaraSignaturesEnabled: true,
};

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

const createMockContext = (): ToolHandlerContext => {
  const mockScopedClient = {
    findEndpointArtifactListItems: jest.fn(),
  };

  const mockEndpointService = createMockEndpointAppContext().service;
  mockEndpointService.getScopedEndpointArtifactClient = jest.fn().mockReturnValue(mockScopedClient);

  return {
    logger: mockLogger,
    request: {} as ToolHandlerContext['request'],
    savedObjectsClient: {} as ToolHandlerContext['savedObjectsClient'],
    esClient: {
      asCurrentUser: {
        security: {
          authenticate: jest.fn().mockResolvedValue({ username: 'test_user' }),
        },
      },
    } as unknown as ToolHandlerContext['esClient'],
    endpointAppContextService: mockEndpointService,
  } as unknown as ToolHandlerContext;
};

const createMockExceptionItem = (
  overrides: Partial<ExceptionListItemSchema> = {}
): ExceptionListItemSchema =>
  ({
    item_id: 'item-1',
    list_id: 'endpoint_trusted_apps',
    name: 'Test Trusted App',
    description: 'A test trusted app',
    entries: [
      {
        field: 'process.executable.caseless',
        operator: 'included',
        type: 'match',
        value: '/usr/bin/safe',
      },
    ],
    os_types: ['linux'],
    tags: ['policy:all'],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-02T00:00:00.000Z',
    id: 'so-id-1',
    created_by: 'admin',
    updated_by: 'admin',
    _version: '1',
    tie_breaker_id: 'tie-1',
    namespace_type: 'agnostic',
    type: 'simple',
    comments: [],
    ...overrides,
  } as ExceptionListItemSchema);

describe('getEndpointArtifactsTool', () => {
  let mockEndpointAppContextService: EndpointAppContextService;
  let mockContext: ToolHandlerContext;
  let mockScopedClient: { findEndpointArtifactListItems: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = createMockContext();
    mockEndpointAppContextService = (
      mockContext as unknown as { endpointAppContextService: EndpointAppContextService }
    ).endpointAppContextService;
    mockScopedClient = mockEndpointAppContextService.getScopedEndpointArtifactClient(
      {} as never,
      {} as never,
      ''
    ) as unknown as { findEndpointArtifactListItems: jest.Mock };
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = getEndpointArtifactsTool(
        mockEndpointAppContextService,
        customYaraSignaturesDisabled
      );
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(GET_ENDPOINT_ARTIFACTS_TOOL_ID);
      expect(tool.description).toContain('endpoint artifacts');
    });

    it('has correct tool id format', () => {
      expect(GET_ENDPOINT_ARTIFACTS_TOOL_ID).toBe(
        'automatic_troubleshooting.get_endpoint_artifacts'
      );
    });
  });

  describe('handler - summary mode', () => {
    let tool: ReturnType<typeof getEndpointArtifactsTool>;

    beforeEach(() => {
      tool = getEndpointArtifactsTool(mockEndpointAppContextService, customYaraSignaturesDisabled);
    });

    it('returns counts for all artifact types when no artifactType specified', async () => {
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [],
        total: 5,
        page: 1,
        per_page: 1,
      });

      const result = await tool.handler({}, mockContext);

      expect('results' in result).toBe(true);
      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        const data = result.results[0].data as Record<string, { total: number }>;
        expect(data.endpoint_exceptions).toEqual({ total: 5 });
        expect(data.trusted_apps).toEqual({ total: 5 });
        expect(data.trusted_devices).toEqual({ total: 5 });
        expect(data.event_filters).toEqual({ total: 5 });
        expect(data.host_isolation_exceptions).toEqual({ total: 5 });
        expect(data.blocklists).toEqual({ total: 5 });
      }
    });

    it('returns per-artifact errors without failing the entire summary', async () => {
      let callCount = 0;
      mockScopedClient.findEndpointArtifactListItems.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          const error = new Error('Forbidden');
          (error as Error & { statusCode: number }).statusCode = 403;
          throw error;
        }
        return { data: [], total: 3, page: 1, per_page: 1 };
      });

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as Record<
          string,
          { total: number } | { error: string }
        >;
        const values = Object.values(data);
        expect(values.filter((v) => 'total' in v)).toHaveLength(5);
        expect(values.filter((v) => 'error' in v)).toHaveLength(1);
        expect(values.find((v) => 'error' in v)).toEqual({ error: 'not_authorized' });
      }
    });

    it('treats null response as empty', async () => {
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue(null);

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, { total: number }>;
        expect(data.endpoint_exceptions).toEqual({ total: 0 });
      }
    });

    it('returns not_authorized for all types when all queries fail with 403 (fake-request scenario)', async () => {
      const forbiddenError = new Error('Forbidden');
      (forbiddenError as Error & { statusCode: number }).statusCode = 403;
      mockScopedClient.findEndpointArtifactListItems.mockRejectedValue(forbiddenError);

      const result = await tool.handler({}, mockContext);

      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        const data = result.results[0].data as Record<string, { error: string }>;
        const values = Object.values(data);
        expect(values).toHaveLength(6);
        expect(values.every((v) => v.error === 'not_authorized')).toBe(true);
      }
    });
  });

  describe('handler - detail mode', () => {
    let tool: ReturnType<typeof getEndpointArtifactsTool>;

    beforeEach(() => {
      tool = getEndpointArtifactsTool(mockEndpointAppContextService, customYaraSignaturesDisabled);
    });

    it('returns trimmed items for a specific artifact type', async () => {
      const mockItem = createMockExceptionItem();
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [mockItem],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await tool.handler({ artifactType: 'trusted_apps' }, mockContext);

      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.other);
        const data = result.results[0].data as {
          artifactType: string;
          total: number;
          items: Array<Record<string, unknown>>;
        };
        expect(data.artifactType).toBe('trusted_apps');
        expect(data.total).toBe(1);
        expect(data.items).toHaveLength(1);
        expect(data.items[0].item_id).toBe('item-1');
        expect(data.items[0].name).toBe('Test Trusted App');
        expect(data.items[0]).not.toHaveProperty('id');
        expect(data.items[0]).not.toHaveProperty('created_by');
        expect(data.items[0]).not.toHaveProperty('_version');
      }
    });

    it('uses default pagination when not specified', async () => {
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      const result = await tool.handler({ artifactType: 'trusted_apps' }, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as { page: number; perPage: number };
        expect(data.page).toBe(1);
        expect(data.perPage).toBe(20);
      }
    });

    it('passes search param to findEndpointArtifactListItems', async () => {
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await tool.handler({ artifactType: 'trusted_apps', search: 'test with spaces' }, mockContext);

      expect(mockScopedClient.findEndpointArtifactListItems).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test with spaces' })
      );
    });

    it('returns error result with message and metadata on detail mode failure', async () => {
      const error = new Error('Forbidden');
      (error as Error & { statusCode: number }).statusCode = 403;
      mockScopedClient.findEndpointArtifactListItems.mockRejectedValue(error);

      const result = await tool.handler({ artifactType: 'blocklists' }, mockContext);

      if ('results' in result) {
        expect(result.results[0].type).toBe(ToolResultType.error);
        const data = result.results[0].data as {
          message: string;
          metadata: { error: string; artifactType: string };
        };
        expect(data.message).toBe('Not authorized to read endpoint artifacts');
        expect(data.metadata).toEqual({
          error: 'not_authorized',
          artifactType: 'blocklists',
        });
      }
    });
  });

  describe('entry truncation', () => {
    let tool: ReturnType<typeof getEndpointArtifactsTool>;

    beforeEach(() => {
      tool = getEndpointArtifactsTool(mockEndpointAppContextService, customYaraSignaturesDisabled);
    });

    it('truncates large match_any value arrays', async () => {
      const largeValues = Array.from({ length: 100 }, (_, i) => `hash-${i}`);
      const mockItem = createMockExceptionItem({
        entries: [
          {
            field: 'process.hash.sha256',
            operator: 'included',
            type: 'match_any',
            value: largeValues,
          },
        ] as ExceptionListItemSchema['entries'],
      });
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [mockItem],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await tool.handler({ artifactType: 'blocklists' }, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as {
          items: Array<{
            entries: Array<{
              value: string[];
              value_truncated?: boolean;
              value_total?: number;
            }>;
            entries_summary: string;
          }>;
        };
        expect(data.items[0].entries[0].value).toHaveLength(50);
        expect(data.items[0].entries[0].value_truncated).toBe(true);
        expect(data.items[0].entries[0].value_total).toBe(100);
        expect(data.items[0].entries_summary).toContain('1 truncated');
      }
    });

    it('truncates long string values', async () => {
      const longValue = 'x'.repeat(1000);
      const mockItem = createMockExceptionItem({
        entries: [
          {
            field: 'process.executable.caseless',
            operator: 'included',
            type: 'match',
            value: longValue,
          },
        ] as ExceptionListItemSchema['entries'],
      });
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [mockItem],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await tool.handler({ artifactType: 'trusted_apps' }, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as {
          items: Array<{
            entries: Array<{ value: string; string_truncated?: boolean }>;
          }>;
        };
        expect(data.items[0].entries[0].value).toHaveLength(512);
        expect(data.items[0].entries[0].string_truncated).toBe(true);
      }
    });

    it('truncates long strings within array values', async () => {
      const longString = 'x'.repeat(1000);
      const values = [longString, 'short', 'y'.repeat(600)];
      const mockItem = createMockExceptionItem({
        entries: [
          {
            field: 'process.hash.sha256',
            operator: 'included',
            type: 'match_any',
            value: values,
          },
        ] as ExceptionListItemSchema['entries'],
      });
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [mockItem],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await tool.handler({ artifactType: 'blocklists' }, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as {
          items: Array<{
            entries: Array<{
              value: string[];
              values_strings_truncated?: boolean;
            }>;
          }>;
        };
        const entry = data.items[0].entries[0];
        expect(entry.value).toHaveLength(3);
        expect(entry.value[0]).toHaveLength(512);
        expect(entry.value[1]).toBe('short');
        expect(entry.value[2]).toHaveLength(512);
        expect(entry.values_strings_truncated).toBe(true);
      }
    });

    it('truncates nested entries recursively', async () => {
      const largeNestedValues = Array.from({ length: 100 }, (_, i) => `val-${i}`);
      const mockItem = createMockExceptionItem({
        entries: [
          {
            field: 'file',
            type: 'nested',
            entries: [
              {
                field: 'hash.sha256',
                operator: 'included',
                type: 'match_any',
                value: largeNestedValues,
              },
            ],
          },
        ] as ExceptionListItemSchema['entries'],
      });
      mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
        data: [mockItem],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const result = await tool.handler({ artifactType: 'endpoint_exceptions' }, mockContext);

      if ('results' in result) {
        const data = result.results[0].data as {
          items: Array<{
            entries: Array<{
              entries: Array<{
                value: string[];
                value_truncated?: boolean;
                value_total?: number;
              }>;
            }>;
            entries_summary: string;
          }>;
        };
        const nested = data.items[0].entries[0].entries[0];
        expect(nested.value).toHaveLength(50);
        expect(nested.value_truncated).toBe(true);
        expect(nested.value_total).toBe(100);
        expect(data.items[0].entries_summary).toContain('1 truncated');
      }
    });
  });

  describe('custom YARA signatures', () => {
    const yaraListId = ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id;

    const createMockYaraSignature = (ruleText: string) =>
      createMockExceptionItem({
        id: 'yara-so-id',
        item_id: 'yara-item-id',
        list_id: yaraListId,
        name: 'Suspicious loader',
        entries: [
          {
            field: CUSTOM_YARA_SIGNATURE_FIELD_TYPE,
            operator: 'included',
            type: 'match',
            value: ruleText,
          },
        ] as ExceptionListItemSchema['entries'],
      });

    describe('when the feature flag is disabled', () => {
      let tool: ReturnType<typeof getEndpointArtifactsTool>;

      beforeEach(() => {
        tool = getEndpointArtifactsTool(
          mockEndpointAppContextService,
          customYaraSignaturesDisabled
        );
      });

      it('does not mention custom YARA signatures in the tool description', () => {
        expect(tool.description).not.toMatch(/yara/i);
      });

      it('rejects the custom_yara_signatures artifact type', () => {
        expect(tool.schema.safeParse({ artifactType: 'custom_yara_signatures' }).success).toBe(
          false
        );
      });

      it('does not query the custom YARA signatures list in summary mode', async () => {
        mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
          data: [],
          total: 1,
          page: 1,
          per_page: 1,
        });

        const result = await tool.handler({}, mockContext);

        expect(mockScopedClient.findEndpointArtifactListItems).not.toHaveBeenCalledWith(
          expect.objectContaining({ listId: yaraListId })
        );
        if ('results' in result) {
          expect(result.results[0].data).not.toHaveProperty('custom_yara_signatures');
        }
      });
    });

    describe('when the feature flag is enabled', () => {
      let tool: ReturnType<typeof getEndpointArtifactsTool>;

      beforeEach(() => {
        tool = getEndpointArtifactsTool(mockEndpointAppContextService, customYaraSignaturesEnabled);
      });

      it('mentions custom YARA signatures in the tool description', () => {
        expect(tool.description).toContain('custom YARA signatures');
        expect(tool.description).toContain('`rule.custom_yara_signature.entry_id`');
        expect(tool.description).toContain('truncated preview');
        expect(tool.description).toContain(
          'When a rule entry has `string_truncated: true`, do not explain why the signature matches or does not match'
        );
        expect(tool.description).toContain('only treat items whose `name` matches it');
      });

      it('includes custom YARA signatures in summary mode', async () => {
        mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
          data: [],
          total: 2,
          page: 1,
          per_page: 1,
        });

        const result = await tool.handler({}, mockContext);

        expect(mockScopedClient.findEndpointArtifactListItems).toHaveBeenCalledWith(
          expect.objectContaining({ listId: yaraListId })
        );
        if ('results' in result) {
          const data = result.results[0].data as Record<string, { total: number }>;
          expect(Object.keys(data)).toHaveLength(7);
          expect(data.custom_yara_signatures).toEqual({ total: 2 });
        }
      });

      it('returns custom YARA signatures with their saved object id', async () => {
        mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
          data: [createMockYaraSignature('rule Example { condition: true }')],
          total: 1,
          page: 1,
          per_page: 20,
        });

        const result = await tool.handler({ artifactType: 'custom_yara_signatures' }, mockContext);

        expect(mockScopedClient.findEndpointArtifactListItems).toHaveBeenCalledWith(
          expect.objectContaining({ listId: yaraListId })
        );
        if ('results' in result) {
          const data = result.results[0].data as { items: Array<Record<string, unknown>> };
          expect(data.items[0]).toEqual(
            expect.objectContaining({
              id: 'yara-so-id',
              item_id: 'yara-item-id',
              name: 'Suspicious loader',
            })
          );
        }
      });

      it('does not add the saved object id to other artifact types', async () => {
        mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
          data: [createMockExceptionItem()],
          total: 1,
          page: 1,
          per_page: 20,
        });

        const result = await tool.handler({ artifactType: 'trusted_apps' }, mockContext);

        if ('results' in result) {
          const data = result.results[0].data as { items: Array<Record<string, unknown>> };
          expect(data.items[0]).not.toHaveProperty('id');
        }
      });

      it('truncates long YARA rule text', async () => {
        mockScopedClient.findEndpointArtifactListItems.mockResolvedValue({
          data: [createMockYaraSignature(`rule Long { strings: $a = "${'x'.repeat(1000)}" }`)],
          total: 1,
          page: 1,
          per_page: 20,
        });

        const result = await tool.handler({ artifactType: 'custom_yara_signatures' }, mockContext);

        if ('results' in result) {
          const data = result.results[0].data as {
            items: Array<{ entries: Array<{ value: string; string_truncated?: boolean }> }>;
          };
          expect(data.items[0].entries[0].value).toHaveLength(512);
          expect(data.items[0].entries[0].string_truncated).toBe(true);
        }
      });
    });
  });
});

describe('classifyArtifactError', () => {
  it('classifies errors with statusCode 403 as not_authorized', () => {
    const error = new Error('Forbidden');
    (error as Error & { statusCode: number }).statusCode = 403;
    expect(classifyArtifactError(error)).toBe('not_authorized');
  });

  it('classifies errors with body.statusCode 403 as not_authorized', () => {
    const error = new Error('Forbidden');
    (error as Error & { body: { statusCode: number } }).body = { statusCode: 403 };
    expect(classifyArtifactError(error)).toBe('not_authorized');
  });

  it('classifies errors with getStatusCode() returning 403 as not_authorized', () => {
    const error = new Error('Forbidden');
    (error as Error & { getStatusCode: () => number }).getStatusCode = () => 403;
    expect(classifyArtifactError(error)).toBe('not_authorized');
  });

  it('classifies feature-disabled errors', () => {
    const error = new Error('Trusted devices is not enabled');
    expect(classifyArtifactError(error)).toBe('feature_disabled');
  });

  it('classifies feature is disabled errors', () => {
    const error = new Error('This feature is disabled');
    expect(classifyArtifactError(error)).toBe('feature_disabled');
  });

  it('classifies generic errors as unknown_error', () => {
    expect(classifyArtifactError(new Error('something broke'))).toBe('unknown_error');
  });

  it('classifies Boom errors with output.statusCode 403 as not_authorized', () => {
    const error = new Error('Forbidden');
    (error as Error & { output: { statusCode: number } }).output = { statusCode: 403 };
    expect(classifyArtifactError(error)).toBe('not_authorized');
  });

  it('classifies non-Error objects as unknown_error', () => {
    expect(classifyArtifactError('string error')).toBe('unknown_error');
  });
});

describe('buildArtifactFilter', () => {
  it('returns undefined when no filters specified', () => {
    expect(buildArtifactFilter({})).toBeUndefined();
  });

  it('builds osType filter with escapeKuery', () => {
    const filter = buildArtifactFilter({ osType: 'windows' });
    expect(filter).toContain('exception-list-agnostic.attributes.os_types:"windows"');
    expect(() => fromKueryExpression(filter!)).not.toThrow();
  });

  it('builds policyId filter with global and per-policy tags', () => {
    const filter = buildArtifactFilter({ policyId: 'policy-123' });
    expect(filter).toContain('policy:all');
    expect(filter).toContain('policy:policy-123');
    expect(() => fromKueryExpression(filter!)).not.toThrow();
  });

  it('combines osType and policyId filters with AND', () => {
    const filter = buildArtifactFilter({ osType: 'linux', policyId: 'p1' });
    expect(filter).toContain(' AND ');
    expect(filter).toContain('os_types:"linux"');
    expect(filter).toContain('policy:p1');
    expect(() => fromKueryExpression(filter!)).not.toThrow();
  });
});
