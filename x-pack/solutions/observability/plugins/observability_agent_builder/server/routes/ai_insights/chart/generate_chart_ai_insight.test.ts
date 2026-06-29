/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { MessageRole, InferenceConnectorType } from '@kbn/inference-common';
import type { BoundInferenceClient, InferenceConnector } from '@kbn/inference-common';
import { generateChartAiInsight } from './generate_chart_ai_insight';

describe('generateChartAiInsight', () => {
  const connector: InferenceConnector = {
    connectorId: 'test-connector',
    name: 'Test connector',
    type: InferenceConnectorType.Inference,
    config: {},
    capabilities: {},
    isInferenceEndpoint: true,
    isPreconfigured: false,
    isEis: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isMissingSecrets: false,
  };

  it('streams chart context and chat completion events', async () => {
    const chatComplete = jest.fn().mockReturnValue(
      of({
        type: 'chatCompletionMessage',
        content: 'Throughput peaked at noon.',
      })
    );

    const inferenceClient = {
      chatComplete,
    } as unknown as BoundInferenceClient;

    const result = generateChartAiInsight({
      chartTitle: 'Latency',
      start: '2024-05-01T00:00:00.000Z',
      end: '2024-05-01T23:59:59.999Z',
      series: [
        {
          title: 'Average',
          data: [
            { x: 1_714_531_200_000, y: 100 },
            { x: 1_714_534_800_000, y: 250 },
          ],
        },
      ],
      inferenceClient,
      connector,
    });

    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: MessageRole.User,
            content: expect.stringContaining('Latency'),
          }),
        ],
        stream: true,
      })
    );

    const events: Array<{ type: string; content?: string; context?: string }> = [];
    await new Promise<void>((resolve, reject) => {
      result.events$.subscribe({
        next: (event) => events.push(event),
        error: reject,
        complete: resolve,
      });
    });

    expect(events[0]).toEqual(expect.objectContaining({ type: 'context' }));
    expect(events[1]).toEqual(expect.objectContaining({ type: 'connectorInfo' }));
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        type: 'chatCompletionMessage',
        content: 'Throughput peaked at noon.',
      })
    );
  });
});
