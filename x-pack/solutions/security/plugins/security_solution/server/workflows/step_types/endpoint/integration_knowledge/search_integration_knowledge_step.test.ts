/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { createSearchIntegrationKnowledgeStepDefinition } from './search_integration_knowledge_step';
import {
  ENVELOPE_TOKEN_BUDGET,
  MAX_INPUT_STRING_CHARS,
  MAX_KNOWLEDGE_RESULTS,
} from '../../../../../common/workflows/step_types/common/budget';

const createMockEsClient = () =>
  ({ search: jest.fn() } as unknown as jest.Mocked<Pick<ElasticsearchClient, 'search'>>);

const createMockContext = (rawInput: Record<string, unknown>) => {
  return {
    input: rawInput,
    config: {},
    rawInput,
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
    stepType: 'security.searchIntegrationKnowledge',
  } as unknown as StepHandlerContext<unknown, unknown>;
};

const buildHit = (source: Record<string, unknown>, highlight?: string[]) => ({
  _source: source,
  ...(highlight ? { highlight: { content: highlight } } : {}),
});

describe('createSearchIntegrationKnowledgeStepDefinition', () => {
  let esClient: ReturnType<typeof createMockEsClient>;

  beforeEach(() => {
    esClient = createMockEsClient();
  });

  const runHandler = async (rawInput: Record<string, unknown>) =>
    createSearchIntegrationKnowledgeStepDefinition({
      getInternalEsClient: () => esClient as unknown as ElasticsearchClient,
    }).handler(createMockContext(rawInput));

  it('restates the platform tool query: index, semantic content query, package_name filter, highlight block', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    await runHandler({ query: 'trusted app best practices', package_name: 'endpoint', max: 5 });

    expect(esClient.search).toHaveBeenCalledWith({
      index: '.integration_knowledge',
      size: 5,
      query: {
        bool: {
          must: [{ semantic: { field: 'content', query: 'trusted app best practices' } }],
          filter: [{ term: { package_name: 'endpoint' } }],
        },
      },
      highlight: {
        fields: { content: { order: 'score', number_of_fragments: 5 } },
      },
      _source: ['package_name', 'filename', 'content', 'version'],
    });
  });

  it('defaults an omitted package_name and max before searching', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    await runHandler({ query: 'endpoint configuration' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 5,
        query: {
          bool: {
            must: [{ semantic: { field: 'content', query: 'endpoint configuration' } }],
            filter: [{ term: { package_name: 'endpoint' } }],
          },
        },
      })
    );
  });

  it('passes max as the search size and the requested package_name as the filter', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    await runHandler({ query: 'duplicate artifacts', package_name: 'endpoint', max: 3 });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ size: 3, query: expect.objectContaining({}) })
    );
    const callBody = esClient.search.mock.calls[0][0] as { query: { bool: { filter: unknown[] } } };
    expect(callBody.query.bool.filter).toContainEqual({ term: { package_name: 'endpoint' } });
  });

  it('returns excerpts built from highlight fragments', async () => {
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          buildHit(
            {
              package_name: 'endpoint',
              filename: 'trusted-apps.md',
              content: 'full',
              version: '8.0.0',
            },
            ['fragment one', 'fragment two']
          ),
        ],
      },
    } as never);

    const result = await runHandler({ query: 'trusted apps' });

    expect(result).toEqual({
      output: {
        available: true,
        results: [
          {
            filename: 'trusted-apps.md',
            version: '8.0.0',
            excerpt: 'fragment one\n\n---\n\nfragment two',
          },
        ],
      },
    });
  });

  it('cuts a joined highlight excerpt to the content cap', async () => {
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          buildHit({ package_name: 'endpoint', filename: 'f.md', content: 'x' }, [
            'h'.repeat(5000),
          ]),
        ],
      },
    } as never);

    const result = await runHandler({ query: 'q' });

    expect(result.output!.results[0].excerpt).toBe(`${'h'.repeat(4000)}\n\n[Content truncated...]`);
  });

  it('falls back to truncated content when no highlight is returned and defaults a missing version', async () => {
    const longContent = 'a'.repeat(5000);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [buildHit({ package_name: 'endpoint', filename: 'f.md', content: longContent })],
      },
    } as never);

    const result = await runHandler({ query: 'q' });

    expect(result).toEqual({
      output: {
        available: true,
        results: [
          {
            filename: 'f.md',
            version: '',
            excerpt: `${'a'.repeat(4000)}\n\n[Content truncated...]`,
          },
        ],
      },
    });
  });

  it('keeps the maximal knowledge output under ENVELOPE_TOKEN_BUDGET', async () => {
    esClient.search.mockResolvedValue({
      hits: {
        hits: Array.from({ length: MAX_KNOWLEDGE_RESULTS }, () =>
          buildHit(
            {
              package_name: 'endpoint',
              filename: 'f'.repeat(MAX_INPUT_STRING_CHARS),
              content: 'c'.repeat(MAX_INPUT_STRING_CHARS),
              version: 'v'.repeat(MAX_INPUT_STRING_CHARS),
            },
            ['h'.repeat(5000)]
          )
        ),
      },
    } as never);

    const result = await runHandler({ query: 'q', max: MAX_KNOWLEDGE_RESULTS });

    expect(result.output!.results).toHaveLength(MAX_KNOWLEDGE_RESULTS);
    expect(estimateTokens(result.output)).toBeLessThan(ENVELOPE_TOKEN_BUDGET);
  });

  it('returns available false when the knowledge index is missing', async () => {
    esClient.search.mockRejectedValue(
      Object.assign(new Error('index_not_found_exception'), {
        meta: { statusCode: 404 },
        body: { error: { type: 'index_not_found_exception' } },
      })
    );

    const result = await runHandler({ query: 'q' });

    expect(result).toEqual({ output: { available: false, results: [] } });
  });

  it('degrades to available false on an authorization error', async () => {
    esClient.search.mockRejectedValue(
      Object.assign(new Error('security_exception'), {
        meta: { statusCode: 403 },
        body: { error: { type: 'security_exception' } },
      })
    );

    const result = await runHandler({ query: 'q' });

    expect(result).toEqual({ output: { available: false, results: [] } });
  });

  it('propagates a non-authorization failure', async () => {
    esClient.search.mockRejectedValue(
      Object.assign(new Error('es refused'), {
        meta: { statusCode: 500 },
        body: { error: { type: 'search_phase_execution_exception' } },
      })
    );

    await expect(runHandler({ query: 'q' })).rejects.toBeInstanceOf(ExecutionError);
  });
});
