/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoundModelUsageStats } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server';

type GetUsageStats = ModelProvider['getUsageStats'];

export interface ModelUsageSummary {
  connector_id?: string;
  model?: string;
  llm_calls: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  reasoning_tokens: number;
}

/**
 * Sums LLM usage from model providers (memory and Wiki optimize) and agent rounds
 * (decision-tree reinforcement, investigation runs) into the fields the cost events carry.
 */
export class ModelUsageCollector {
  private readonly providerStats: GetUsageStats[] = [];
  private readonly rounds: RoundModelUsageStats[] = [];

  addModelProvider(getUsageStats: GetUsageStats): void {
    this.providerStats.push(getUsageStats);
  }

  addRound(usage: RoundModelUsageStats | undefined): void {
    if (usage) {
      this.rounds.push(usage);
    }
  }

  summarize(): ModelUsageSummary {
    const summary: ModelUsageSummary = {
      llm_calls: 0,
      input_tokens: 0,
      output_tokens: 0,
      cached_input_tokens: 0,
      reasoning_tokens: 0,
    };

    for (const getUsageStats of this.providerStats) {
      for (const { connectorId, model, tokens } of getUsageStats().calls) {
        summary.connector_id = connectorId;
        summary.model = model ?? summary.model;
        summary.llm_calls += 1;
        summary.input_tokens += tokens?.prompt ?? 0;
        // Same convention as Agent Builder rounds: thinking counts as output, and
        // `reasoning_tokens` is a subset of `output_tokens`.
        summary.output_tokens += (tokens?.completion ?? 0) + (tokens?.thinking ?? 0);
        summary.cached_input_tokens += tokens?.cached ?? 0;
        summary.reasoning_tokens += tokens?.thinking ?? 0;
      }
    }

    for (const round of this.rounds) {
      // 'unknown' marks a round that made no LLM call.
      if (round.connector_id && round.connector_id !== 'unknown') {
        summary.connector_id = round.connector_id;
      }
      summary.model = round.model ?? summary.model;
      summary.llm_calls += round.llm_calls;
      summary.input_tokens += round.input_tokens;
      summary.output_tokens += round.output_tokens;
      summary.cached_input_tokens += round.cached_input_tokens ?? 0;
      summary.reasoning_tokens += round.reasoning_tokens ?? 0;
    }

    return summary;
  }
}
