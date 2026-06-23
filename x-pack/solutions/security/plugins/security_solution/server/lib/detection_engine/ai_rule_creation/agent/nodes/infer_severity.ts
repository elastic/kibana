/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { RuleCreationState } from '../state';
import { SEVERITY_INFERENCE_PROMPT } from './prompts';

export interface SeverityInferenceResponse {
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
}

interface InferSeverityNodeParams {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}

/**
 * Valid risk_score ranges per severity level.
 * When the LLM returns a risk_score within the range, we keep it;
 * when it falls outside, we clamp to the default for that severity.
 */
const SEVERITY_RISK_SCORE_RANGES: Record<
  string,
  { min: number; max: number; default: number }
> = {
  low: { min: 0, max: 46, default: 21 },
  medium: { min: 47, max: 72, default: 47 },
  high: { min: 73, max: 98, default: 73 },
  critical: { min: 99, max: 100, default: 99 },
};

/**
 * Validates that the inferred severity/risk_score pair is consistent.
 * If the LLM's risk_score falls within the valid range for the severity
 * level, it is preserved. Otherwise the canonical default is used.
 */
const validateSeverityMapping = (
  response: SeverityInferenceResponse
): SeverityInferenceResponse => {
  const normalizedSeverity = response.severity?.toLowerCase();
  const range = SEVERITY_RISK_SCORE_RANGES[normalizedSeverity];

  if (!range) {
    return { severity: 'low', risk_score: SEVERITY_RISK_SCORE_RANGES.low.default };
  }

  const riskScore =
    typeof response.risk_score === 'number' &&
    response.risk_score >= range.min &&
    response.risk_score <= range.max
      ? response.risk_score
      : range.default;

  return {
    severity: normalizedSeverity as SeverityInferenceResponse['severity'],
    risk_score: riskScore,
  };
};

export const inferSeverityNode = ({ model, events }: InferSeverityNodeParams) => {
  const jsonParser = new JsonOutputParser<SeverityInferenceResponse>();

  return async (state: RuleCreationState): Promise<RuleCreationState> => {
    events?.reportProgress('Analyzing detection scenario to determine severity and risk score...');

    try {
      const severityInferenceChain = SEVERITY_INFERENCE_PROMPT.pipe(model).pipe(jsonParser);

      const severityInferenceResult = await severityInferenceChain.invoke({
        user_request: state.userQuery,
        esql_query: state?.rule?.query || '',
      });

      const validatedResult = validateSeverityMapping(severityInferenceResult);

      events?.reportProgress(
        `Severity inferred: ${validatedResult.severity} (risk score: ${validatedResult.risk_score})`
      );

      return {
        ...state,
        rule: {
          severity: validatedResult.severity,
          risk_score: validatedResult.risk_score,
        },
      };
    } catch (error) {
      events?.reportProgress(`Failed to infer severity: ${error.message}, using defaults`);
      // Don't fail the entire rule creation if severity inference fails
      return {
        ...state,
        warnings: [`Failed to infer severity: ${error.message}`],
      };
    }
  };
};
