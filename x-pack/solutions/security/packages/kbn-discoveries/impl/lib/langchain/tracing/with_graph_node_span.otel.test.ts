/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { END, START, Annotation, StateGraph } from '@langchain/langgraph';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { SpanStatusCode, context } from '@opentelemetry/api';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';

import type { TracedGraphState } from './with_graph_node_span';
import { withGraphNodeSpan } from './with_graph_node_span';

const GraphState = Annotation.Root({
  errors: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  generationAttempts: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  generations: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
  hallucinationFailures: Annotation<number>({ reducer: (_, next) => next, default: () => 0 }),
  maxGenerationAttempts: Annotation<number>({ reducer: (_, next) => next, default: () => 10 }),
  maxHallucinationFailures: Annotation<number>({ reducer: (_, next) => next, default: () => 5 }),
  refinements: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
});

type State = typeof GraphState.State & TracedGraphState;

const initialState: State = {
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  refinements: [],
};

describe('withGraphNodeSpan with a real tracer', () => {
  const exporter = new tracing.InMemorySpanExporter();
  const contextManager = new AsyncHooksContextManager();

  beforeAll(() => {
    contextManager.enable();
    context.setGlobalContextManager(contextManager);
    initInferenceTracerProvider({
      processors: [new tracing.SimpleSpanProcessor(exporter)],
      resource: resources.defaultResource(),
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

  const buildGraph = (second: (state: State) => Promise<State>) =>
    new StateGraph(GraphState)
      .addNode(
        'first',
        withGraphNodeSpan<State>('first', async (state) => ({
          ...state,
          generationAttempts: state.generationAttempts + 1,
          generations: ['g1'],
        }))
      )
      .addNode('second', withGraphNodeSpan<State>('second', second))
      .addEdge(START, 'first')
      .addEdge('first', 'second')
      .addEdge('second', END)
      .compile();

  it('records the node spans as children of the root span with their counters', async () => {
    const graph = buildGraph(async (state) => ({ ...state, refinements: ['r1'] }));

    await withActiveInferenceSpan('attack_discovery.graph', {}, () => graph.invoke(initialState));

    const spans = exporter.getFinishedSpans();
    const root = spans.find(({ name }) => name === 'attack_discovery.graph');
    const first = spans.find(({ name }) => name === 'attack_discovery.first');
    const second = spans.find(({ name }) => name === 'attack_discovery.second');

    expect(root).toBeDefined();
    expect(first?.parentSpanContext?.spanId).toBe(root?.spanContext().spanId);
    expect(second?.parentSpanContext?.spanId).toBe(root?.spanContext().spanId);
    expect(first?.attributes).toEqual(
      expect.objectContaining({
        'attack_discovery.generation_attempts': 1,
        'attack_discovery.generations_count': 1,
        'attack_discovery.max_generation_attempts': 10,
      })
    );
    expect(second?.attributes).toEqual(
      expect.objectContaining({ 'attack_discovery.refinements_count': 1 })
    );
  });

  it('ends a throwing node span in ERROR and rethrows the same error object', async () => {
    const error = new Error('node failed');
    const graph = buildGraph(async () => {
      throw error;
    });

    await expect(
      withActiveInferenceSpan('attack_discovery.graph', {}, () => graph.invoke(initialState))
    ).rejects.toBe(error);

    const spans = exporter.getFinishedSpans();
    const second = spans.find(({ name }) => name === 'attack_discovery.second');
    const root = spans.find(({ name }) => name === 'attack_discovery.graph');

    expect(second?.status.code).toBe(SpanStatusCode.ERROR);
    expect(second?.attributes).toEqual(
      expect.objectContaining({ 'attack_discovery.generation_attempts': 1 })
    );
    expect(root?.status.code).toBe(SpanStatusCode.ERROR);
  });
});
