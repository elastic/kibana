/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { LeadEntity, Observation } from '../types';
import { entityToKey } from '../observation_modules/utils';

export interface ScoredEntityInput {
  readonly entity: LeadEntity;
  readonly priority: number;
  readonly observations: Observation[];
}

export interface LlmSynthesisResult {
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
  readonly recommendations: string[];
}

const BATCH_SYNTHESIS_PROMPT = `You are a senior security analyst writing threat hunting leads for a SOC team. Each lead covers a single entity. Your job is to produce a narrative that gives an analyst immediate context and a clear reason to investigate — not a restatement of the raw alert data.

Rules:
- Write as if briefing a colleague who knows nothing about this entity yet
- If the data is thin (e.g. one alert), say what that alert type typically indicates and why it still warrants attention for this entity given their role or criticality
- Reference the entity's asset criticality and privilege status where present — a single MFA failure from a privileged admin is very different from one on a standard user
- Never pad with generic security advice; every sentence must be grounded in the specific data provided

You will receive data for {lead_count} lead(s). Respond ONLY with a valid JSON array (no markdown fences, no extra text) containing exactly {lead_count} objects in the same order as the input, each matching this schema:
{{
  "title": "string - 3 to 5 words. A specific threat label, not a restatement of the rule name. Vary titles across leads — avoid repeating the same phrase. Good: 'Credential access attempt', 'Suspicious admin activity', 'Authentication bypass signal'. Bad: 'Okta MFA Verification Failure' (that is the rule name, not a title).",
  "description": "string - 2 to 4 sentences, plain text, no markdown. Explain: (1) what the evidence shows, (2) why this entity specifically warrants investigation (their role, criticality, or the pattern), (3) what an attacker might be doing. Be direct and specific — name rule names, scores, counts from the data. If data is limited, explain why this signal still matters.",
  "tags": ["3 to 6 tags. Short, human-readable. Mix technique tags from rule names in the data with contextual tags like the entity's role or criticality tier. Never use MITRE IDs."],
  "recommendations": ["3 to 5 specific chat prompts an analyst pastes directly into an AI assistant. Name the entity, timeframe, and data source in each prompt. Good: 'Show me all authentication events for {{entity}} in the last 48h including source IPs and geolocations', 'Has {{entity}} accessed any new systems or services in the last 7 days that they haven't used in the past 30?'. Bad: 'Review recent activity' (too vague)."]
}}

**Leads:**
{leads_payload}

Respond with the JSON array only.`;

const batchSynthesisPrompt = ChatPromptTemplate.fromTemplate(BATCH_SYNTHESIS_PROMPT);

const formatEntityLine = (s: ScoredEntityInput): string => {
  const entityDoc = JSON.stringify(s.entity.record);
  return `  - ${s.entity.type} "${s.entity.name}" (priority: ${s.priority}/10)\n    Entity document: ${entityDoc}`;
};

const formatLeadsPayload = (groups: ScoredEntityInput[][]): string => {
  return groups
    .map((group, i) => {
      const entityLines = group.map(formatEntityLine).join('\n');

      const obsLines = group
        .flatMap((s) => {
          const key = entityToKey(s.entity);
          return s.observations
            .filter((o) => o.entityId === key)
            .map((obs) => {
              const metaEntries = Object.entries(obs.metadata)
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                .join(', ');
              return `  - [${obs.severity.toUpperCase()}] ${obs.description} (type=${
                obs.type
              }, score=${obs.score}/100${metaEntries ? `, ${metaEntries}` : ''})`;
            });
        })
        .join('\n');

      const header =
        group.length > 1
          ? `### Lead ${i + 1} — Campaign (${group.length} entities)`
          : `### Lead ${i + 1} — Single entity`;
      return `${header}\n${entityLines}\n${obsLines}`;
    })
    .join('\n\n');
};

/**
 * Use an LLM to synthesize content for all leads in a single batch call.
 * Returns results in the same order as the input groups.
 * Throws on failure — the caller should surface the error.
 */
export const llmSynthesizeBatch = async (
  chatModel: InferenceChatModel,
  groups: ScoredEntityInput[][],
  logger: Logger
): Promise<LlmSynthesisResult[]> => {
  if (groups.length === 0) return [];

  const leadsPayload = formatLeadsPayload(groups);
  const jsonParser = new JsonOutputParser<LlmSynthesisResult[]>();
  const chain = batchSynthesisPrompt.pipe(chatModel).pipe(jsonParser);

  logger.info(`[LeadGenerationEngine] Invoking LLM for batch synthesis of ${groups.length} leads`);

  const results = await chain.invoke({
    lead_count: String(groups.length),
    leads_payload: leadsPayload,
  });

  logger.info(
    `[LeadGenerationEngine] LLM batch synthesis completed — ${
      results?.length ?? 0
    } results returned`
  );

  if (!Array.isArray(results) || results.length !== groups.length) {
    throw new Error(
      `LLM batch synthesis returned ${
        Array.isArray(results) ? results.length : typeof results
      } items, expected ${groups.length}`
    );
  }

  return results.map((result) => {
    if (
      typeof result.title !== 'string' ||
      typeof result.description !== 'string' ||
      !Array.isArray(result.tags) ||
      !Array.isArray(result.recommendations)
    ) {
      throw new Error('LLM returned malformed JSON: missing required fields in batch item');
    }
    return {
      title: truncateTitle(result.title, 5),
      description: stripMarkdown(result.description),
      tags: result.tags
        .map(String)
        .filter((t) => !/^T\d{4}(\.\d{3})?$/i.test(t.trim()))
        .slice(0, 6),
      recommendations: result.recommendations.map(String).slice(0, 5),
    };
  });
};

/** Keep only the first N words of a title so card headings stay short. */
const truncateTitle = (title: string, maxWords: number): string => {
  const words = title.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return title.trim();
  }
  return words.slice(0, maxWords).join(' ');
};

/** Remove markdown bold/italic/heading markers so descriptions render as plain text. */
const stripMarkdown = (text: string): string =>
  text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
