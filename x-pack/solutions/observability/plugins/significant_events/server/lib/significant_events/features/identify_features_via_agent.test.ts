/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { FINALIZE_FEATURES_TOOL_ID } from '../../../agent_builder/skills/feature_identification';
import { readFeatureIdentificationResult } from './identify_features_via_agent';

const finalizeStep = (
  toolCallId: string,
  params: Record<string, unknown>,
  results: Array<{ type: ToolResultType; data: Record<string, unknown> }>
) => ({
  type: ConversationRoundStepType.toolCall,
  tool_id: FINALIZE_FEATURES_TOOL_ID,
  tool_call_id: toolCallId,
  params,
  results,
});

const conversationOf = (steps: unknown[], interruption?: unknown) =>
  ({
    rounds: [
      {
        steps,
        interruption,
        time_to_last_token: 4321,
        model_usage: { input_tokens: 10, output_tokens: 5, cached_input_tokens: 2 },
      },
    ],
  } as unknown as Pick<Conversation, 'rounds'>);

describe('readFeatureIdentificationResult', () => {
  it('uses the successful finalize call and ignores one the tool rejected', () => {
    const conversation = conversationOf([
      finalizeStep('failed-finalize', {}, [
        { type: ToolResultType.error, data: { message: 'Invalid parameters' } },
      ]),
      finalizeStep('successful-finalize', { features: [], ignored_features: [] }, [
        { type: ToolResultType.other, data: { finalized: true } },
      ]),
    ]);

    expect(readFeatureIdentificationResult({ conversation, logger: loggerMock.create() })).toEqual({
      features: [],
      ignoredFeatures: [],
      tokensUsed: { prompt: 10, completion: 5, total: 15, cached: 2 },
    });
  });

  it('throws when the agent never finalized', () => {
    const conversation = conversationOf([
      finalizeStep('failed-finalize', {}, [
        { type: ToolResultType.error, data: { message: 'Invalid parameters' } },
      ]),
    ]);

    expect(() =>
      readFeatureIdentificationResult({ conversation, logger: loggerMock.create() })
    ).toThrow('did not successfully call finalize_features');
  });

  it('throws when the run was interrupted after a successful finalize', () => {
    const conversation = conversationOf(
      [
        finalizeStep('successful-finalize', { features: [], ignored_features: [] }, [
          { type: ToolResultType.other, data: { finalized: true } },
        ]),
      ],
      { type: 'failed' }
    );

    expect(() =>
      readFeatureIdentificationResult({ conversation, logger: loggerMock.create() })
    ).toThrow('was interrupted');
  });
});
