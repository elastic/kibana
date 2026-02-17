/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';

export interface GeneratedRule {
  name: string;
  description: string;
  query: string;
  type?: string;
  language?: string;
  severity?: string;
  risk_score?: number;
  tags?: string[];
  threat?: Array<{
    framework: string;
    tactic: { id: string; name: string };
    technique?: Array<{ id: string; name: string }>;
  }>;
}

export interface RuleCreationClient {
  createRule(params: { prompt: string }): Promise<{
    rule: GeneratedRule;
    errors?: string[];
  }>;
}

interface AiRuleCreationApiResponse {
  rule?: GeneratedRule & {
    riskScore?: number;
  };
  warnings?: string[];
}

export function createRuleCreationClient(
  fetch: HttpHandler,
  log: ToolingLog,
  connectorId: string
): RuleCreationClient {
  return {
    async createRule({ prompt }) {
      log.debug(`Generating rule for prompt: ${prompt.substring(0, 100)}...`);

      try {
        const response = await fetch<AiRuleCreationApiResponse>(
          '/internal/security_solution/detection_engine/ai_rule_creation',
          {
            method: 'POST',
            version: '1',
            body: JSON.stringify({
              userQuery: prompt,
              connectorId,
            }),
          }
        );

        if (!response || !response.rule) {
          log.warning('API returned no rule');
          return {
            rule: {} as GeneratedRule,
            errors: ['No rule returned from API'],
          };
        }

        return {
          rule: {
            name: response.rule.name,
            description: response.rule.description,
            query: response.rule.query,
            type: response.rule.type,
            language: response.rule.language,
            severity: response.rule.severity,
            risk_score: response.rule.risk_score || response.rule.riskScore,
            tags: response.rule.tags || [],
            threat: response.rule.threat || [],
          },
        };
      } catch (error) {
        log.error(`Rule creation failed: ${error}`);
        return {
          rule: {} as GeneratedRule,
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    },
  };
}
