/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { RuleCreationState }  from '../state';
import { SEVERITY_INFERENCE_PROMPT } from './prompts';

export interface SeverityInferenceResponse {
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
}

interface InferSeverityNodeParams {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}

const SEVERITY_TO_RISK_SCORE: Record<string, number> = {
  low: 21,
  medium: 47,
  high: 73,
  critical: 99,
};

/**
 * Validates that inferred severity maps to the correct risk score.
 * Always enforces the canonical risk score for the severity to ensure
 * consistency with eval expectations and Elastic Security conventions.
 */
const validateSeverityMapping = (response: SeverityInferenceResponse): SeverityInferenceResponse => {
  const normalizedSeverity = response.severity?.toLowerCase();
  const expectedRiskScore = SEVERITY_TO_RISK_SCORE[normalizedSeverity];

  if (!expectedRiskScore) {
    // Invalid severity — default to low
    return { severity: 'low', risk_score: 21 };
  }

  // Always use the canonical risk score for the severity level.
  // The model may hallucinate arbitrary risk scores; we enforce the
  // exact mapping: low=21, medium=47, high=73, critical=99.
  return { severity: normalizedSeverity as SeverityInferenceResponse['severity'], risk_score: expectedRiskScore };
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
