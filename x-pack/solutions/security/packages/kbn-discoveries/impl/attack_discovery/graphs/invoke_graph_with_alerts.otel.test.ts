/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { context, SpanStatusCode } from '@opentelemetry/api';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
} from '@kbn/inference-tracing';

import { getDefaultAttackDiscoveryGraph } from '.';
import { invokeAttackDiscoveryGraphWithAlerts } from './invoke_graph_with_alerts';

jest.mock('@kbn/langchain/server');
jest.mock('@kbn/langchain/server/tracers/langsmith');
jest.mock('.', () => ({
  ...jest.requireActual('.'),
  getDefaultAttackDiscoveryGraph: jest.fn(),
}));

const MODEL_FRAGMENT = 'SECRET-MODEL-PAYLOAD-FRAGMENT';

describe('invokeAttackDiscoveryGraphWithAlerts with a real tracer', () => {
  const exporter = new tracing.InMemorySpanExporter();
  const contextManager = new AsyncHooksContextManager();
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

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

  it('exports the retry-limit failure without the accumulated model errors, while the caller still gets them', async () => {
    (getDefaultAttackDiscoveryGraph as jest.Mock).mockReturnValue({
      invoke: jest.fn().mockResolvedValue({
        anonymizedDocuments: [{ metadata: {}, pageContent: 'alert 1' }],
        errors: [`generate node is unable to parse response: ${MODEL_FRAGMENT}`],
        generationAttempts: 10,
        generations: [],
        hallucinationFailures: 0,
        insights: [],
        maxGenerationAttempts: 10,
        maxHallucinationFailures: 5,
        refinements: [],
        replacements: {},
      }),
    });

    const failure = await invokeAttackDiscoveryGraphWithAlerts({
      actionsClient: {} as PublicMethodsOf<ActionsClient>,
      alerts: [{ metadata: {}, pageContent: 'alert 1' }],
      apiConfig: { action_type_id: '.gen-ai', connector_id: 'test-connector' },
      connectorTimeout: 60000,
      esClient: {} as ElasticsearchClient,
      logger,
      prompts: {
        continue: 'continue prompt',
        default: 'default prompt',
        detailsMarkdown: 'details markdown',
        entitySummaryMarkdown: 'entity summary',
        insights: 'insights prompt',
        mitreAttackTactics: 'mitre tactics',
        refine: 'refine prompt',
        summaryMarkdown: 'summary markdown',
        title: 'title prompt',
      },
    }).then(
      () => undefined,
      (error: Error) => error
    );

    // the caller keeps the full error
    expect(failure?.message).toContain('Maximum generation attempts (10) reached.');
    expect(failure?.message).toContain(MODEL_FRAGMENT);

    const root = exporter.getFinishedSpans().find(({ name }) => name === 'attack_discovery.graph');

    expect(root?.status.code).toBe(SpanStatusCode.ERROR);
    expect(root?.status.message).toContain('Maximum generation attempts (10) reached.');
    expect(root?.attributes['attack_discovery.generation_attempts']).toBe(10);

    // nothing the exporter receives carries the model's text
    const exported = JSON.stringify({ events: root?.events, status: root?.status });

    expect(root?.events.some(({ name }) => name === 'exception')).toBe(true);
    expect(exported).not.toContain(MODEL_FRAGMENT);
  });
});
