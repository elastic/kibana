/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ContentFilteredModelResponseError } from '@kbn/langchain/server';
import type { BaseLLM } from '@langchain/core/language_models/llms';
import { FakeLLM } from '@langchain/core/utils/testing';

import { throwContentFilteredErrorWithGuidance } from '../throw_if_error_counts_exceeded';
import { DEFAULT_MAX_GENERATION_ATTEMPTS } from './constants';
import { getDefaultAttackDiscoveryGraph } from '.';

const prompts = {
  continue: 'continue prompt',
  default: 'default prompt',
  detailsMarkdown: 'details markdown',
  entitySummaryMarkdown: 'entity summary',
  insights: 'insights prompt',
  mitreAttackTactics: 'mitre tactics',
  refine: 'refine prompt',
  summaryMarkdown: 'summary markdown',
  title: 'title prompt',
};

class CountingLlm extends FakeLLM {
  public calls = 0;

  constructor(private readonly behavior: () => string) {
    super({});
  }

  async _call(): Promise<string> {
    this.calls += 1;
    return this.behavior();
  }
}

const invokeGraph = async (llm: CountingLlm) => {
  const graph = getDefaultAttackDiscoveryGraph({
    anonymizationFields: [],
    esClient: {} as ElasticsearchClient,
    llm: llm as unknown as BaseLLM,
    prompts,
    size: 10,
  });

  return graph.invoke({
    anonymizedDocuments: [{ metadata: {}, pageContent: 'alert 1' }],
  });
};

describe('Attack discovery graph content filter fail-fast', () => {
  beforeAll(() => {
    // keep LangSmith's background client out of the test run
    process.env.LANGSMITH_TRACING = 'false';
    process.env.LANGCHAIN_TRACING_V2 = 'false';
  });

  it('invokes the LLM exactly once and rejects with the content-filtered error', async () => {
    const llm = new CountingLlm(() => {
      throw new ContentFilteredModelResponseError({
        connectorId: 'connector-1',
        contentLength: 0,
        responseBody: '',
        model: 'gpt-x',
      });
    });

    const error = await invokeGraph(llm).catch((e) => e);

    expect(llm.calls).toBe(1);
    expect(error).toBeInstanceOf(ContentFilteredModelResponseError);
  });

  it('surfaces a message that names the provider and suggests a different model', async () => {
    const llm = new CountingLlm(() => {
      throw new ContentFilteredModelResponseError({
        connectorId: 'connector-1',
        contentLength: 0,
        responseBody: '',
        model: 'gpt-x',
      });
    });

    const error = await invokeGraph(llm).catch((e) => e);
    const thrown = (() => {
      try {
        return throwContentFilteredErrorWithGuidance({ error, model: 'gpt-x', provider: 'openai' });
      } catch (e) {
        return e as Error;
      }
    })() as Error;

    expect(thrown.message).toContain('openai');
    expect(thrown.message).toContain('Select a different model');
  });

  it('keeps retrying parse failures until the maximum generation attempts', async () => {
    const llm = new CountingLlm(() => 'this is not json');

    await invokeGraph(llm);

    expect(llm.calls).toBe(DEFAULT_MAX_GENERATION_ATTEMPTS);
  });
});
