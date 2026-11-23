/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { context } from '@opentelemetry/api';
import { defaultResource } from '@opentelemetry/resources';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';
import type { BaseLLM } from '@langchain/core/language_models/llms';
import { FakeLLM } from '@langchain/core/utils/testing';

import { getDefaultAttackDiscoveryGraph } from '.';
import { getRawAttackDiscoveriesMock } from '../../../__mocks__/raw_attack_discoveries';

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

describe('default attack discovery graph with a real tracer', () => {
  const exporter = new InMemorySpanExporter();
  const contextManager = new AsyncLocalStorageContextManager();

  beforeAll(() => {
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
    initInferenceTracerProvider({
      processors: [new SimpleSpanProcessor({ exporter })],
      resource: defaultResource(),
    });
  });

  afterEach(() => {
    exporter.reset();
  });

  afterAll(async () => {
    await shutdownInferenceTracerProvider();
    context.disable();
    contextManager.disable();
  });

  it('exports one generate span per retry attempt, then a refine span, as children of the root span', async () => {
    // the first generate attempt returns hallucinated output, which is discarded and retried; then generate and refine succeed
    const responses = [
      '{{ host.name hostNameValue }}',
      getRawAttackDiscoveriesMock(),
      getRawAttackDiscoveriesMock(),
    ];
    const fake = new FakeLLM({ response: '' });
    fake._call = async () => responses.shift() ?? '';
    const llm = fake as unknown as BaseLLM;

    const graph = getDefaultAttackDiscoveryGraph({
      anonymizationFields: [],
      esClient: {} as ElasticsearchClient,
      llm,
      prompts,
      size: 10,
    });

    await withActiveInferenceSpan('attack_discovery.graph', {}, () =>
      graph.invoke({
        anonymizedDocuments: [{ metadata: {}, pageContent: 'alert 1' }],
      })
    );

    const spans = exporter.getFinishedSpans();
    const root = spans.find(({ name }) => name === 'attack_discovery.graph');
    const generateSpans = spans
      .filter(({ name }) => name === 'attack_discovery.generate')
      .sort((a, b) => a.startTime[0] - b.startTime[0] || a.startTime[1] - b.startTime[1]);
    const refineSpans = spans.filter(({ name }) => name === 'attack_discovery.refine');

    expect(root).toBeDefined();
    expect(generateSpans).toHaveLength(2);
    expect(refineSpans).toHaveLength(1);
    expect(
      [...generateSpans, ...refineSpans].every(
        (span) => span.parentSpanContext?.spanId === root?.spanContext().spanId
      )
    ).toBe(true);

    // each span is exported after its node ran, so it records the attempt count the node ended on
    expect(
      generateSpans.map((span) => span.attributes['attack_discovery.generation_attempts'])
    ).toEqual([1, 2]);
    expect(generateSpans[0].attributes['attack_discovery.hallucination_failures']).toBe(1);
    expect(refineSpans[0].attributes['attack_discovery.generation_attempts']).toBe(3);
    expect(refineSpans[0].attributes['attack_discovery.refinements_count']).toBe(1);
  });
});
