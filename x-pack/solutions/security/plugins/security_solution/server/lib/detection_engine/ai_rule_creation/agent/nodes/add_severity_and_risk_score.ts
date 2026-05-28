/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleCreationState } from '../state';
import { SEVERITY_AND_RISK_SCORE_PROMPT } from './prompts';
import { defaultRiskScoreBySeverity } from '../../../../../../common/detection_engine/constants';

interface SeverityAndRiskScoreResponse {
  severity: string;
  risk_score: number;
  reasoning?: string;
}

interface AddSeverityAndRiskScoreNodeParams {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}

const VALID_SEVERITY_VALUES = Object.keys(defaultRiskScoreBySeverity) as Severity[];

const isValidSeverity = (value: string): value is Severity =>
  VALID_SEVERITY_VALUES.includes(value as Severity);

/**
 * Clamps risk_score to the valid 0–100 range and rounds to an integer.
 */
const sanitizeRiskScore = (raw: unknown): number | undefined => {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return undefined;
  return Math.min(100, Math.max(0, Math.round(num)));
};

/**
 * Accepts the model's risk score when it is within ±15 of the canonical default
 * for the given severity; otherwise falls back to the canonical value.
 */
const resolveRiskScore = (severity: Severity, rawScore: number | undefined): number => {
  const canonical = defaultRiskScoreBySeverity[severity];
  if (rawScore === undefined) return canonical;
  return Math.abs(rawScore - canonical) <= 15 ? rawScore : canonical;
};

export const addSeverityAndRiskScoreNode = ({
  model,
  events,
}: AddSeverityAndRiskScoreNodeParams) => {
  const jsonParser = new JsonOutputParser<SeverityAndRiskScoreResponse>();

  return async (state: RuleCreationState): Promise<RuleCreationState> => {
    events?.reportProgress(
      'Inferring severity and risk score from rule intent and threat context...'
    );

    try {
      const severityChain = SEVERITY_AND_RISK_SCORE_PROMPT.pipe(model).pipe(jsonParser);

      const mitreMappings =
        Array.isArray(state.rule?.threat) && state.rule.threat.length > 0
          ? JSON.stringify(
              state.rule.threat.map((t) => ({
                tactic: t.tactic?.name,
                techniques: t.technique?.map((tech) => tech.name),
              }))
            )
          : 'None';

      const result = await severityChain.invoke({
        user_request: state.userQuery,
        esql_query: state.rule?.query ?? '',
        rule_description: state.rule?.description ?? '',
        mitre_mappings: mitreMappings,
      });

      if (!isValidSeverity(result.severity)) {
        events?.reportProgress(
          `Severity inference returned an unrecognised value ("${result.severity}"), keeping defaults`
        );
        return state;
      }

      const severity: Severity = result.severity;
      const sanitized = sanitizeRiskScore(result.risk_score);
      const riskScore = resolveRiskScore(severity, sanitized);

      events?.reportProgress(
        `Severity inferred as "${severity}" with risk score ${riskScore}${
          result.reasoning ? ` — ${result.reasoning}` : ''
        }`
      );

      return {
        ...state,
        rule: {
          severity,
          risk_score: riskScore,
        },
      };
    } catch (error) {
      events?.reportProgress(
        `Failed to infer severity and risk score, keeping defaults: ${error.message}`
      );
      return {
        ...state,
        warnings: [`Failed to infer severity and risk score: ${error.message}`],
      };
    }
  };
};
