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

interface ScoredEntityInput {
  readonly entity: LeadEntity;
  readonly priority: number;
  readonly observations: Observation[];
}

interface LlmSynthesisResult {
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
  readonly recommendations: string[];
}

const SYNTHESIS_PROMPT = `You are a senior security analyst synthesizing threat hunting leads from automated observation data. Produce concise, actionable output that helps a SOC analyst quickly understand and act on the threat.

Respond ONLY with a valid JSON object (no markdown fences, no extra text) matching this schema:
{{
  "title": "string - MAXIMUM 4 WORDS. A short threat label, not a sentence. Good: 'Anomalous behavior', 'Credential harvesting', 'Lateral movement detected', 'Privilege escalation'. Bad: 'Suspected Multi-Tactic Attack Targeting DevOps User with Container Escape'",
  "description": "string - a narrative paragraph (plain text, NO markdown, NO bold/italic markers) connecting the evidence, referencing specific data points (scores, alert counts, escalation deltas), explaining why this matters and what the attacker may be doing. Do NOT use asterisks or markdown formatting.",
  "tags": ["string array - 3 to 6 tags. Use human-readable technique or rule names, NOT numeric IDs. Only use rule names that appear explicitly in the observation data below; do not invent or guess rule names. Good: 'Container Escape Attempt', 'Remote Service Execution', 'Credential Access via Brute Force'. Bad: 'T1075', 'T1078'. Also include short contextual tags like 'Privilege Escalation', 'Lateral Movement'."],
  "recommendations": ["string array - 3 to 5 chat messages an analyst can paste into an AI chat assistant to start investigating. Each must be a direct request or question the analyst would type. Examples: 'Show me the critical/high severity alerts for user \\"jsmith\\" from the last 7 days, grouped by detection rule name', 'Generate an ESQL query to show the risk score trend for user \\"jsmith\\" over the last 30 days', 'What processes or network connections has user \\"jsmith\\" initiated in the last 48 hours?'. Do NOT write generic advice like 'Isolate the account' or 'Review logs'. Write actual chat prompts."]
}}

Analyze the following entity observations and produce a hunting lead.

**Entities:**
{entity_summary}

**Observations:**
{observations_summary}

Respond with the JSON object only.`;

const synthesisPrompt = ChatPromptTemplate.fromTemplate(SYNTHESIS_PROMPT);

const formatEntitySummary = (group: ScoredEntityInput[]): string => {
  return group
    .map(
      (scored) =>
        `- ${scored.entity.type} "${scored.entity.name}" (priority: ${scored.priority}/10, observations: ${scored.observations.length})`
    )
    .join('\n');
};

const formatObservationsSummary = (
  group: ScoredEntityInput[],
  observations: Observation[]
): string => {
  const sections: string[] = [];

  for (const scored of group) {
    const key = entityToKey(scored.entity);
    const entityObs = observations.filter((o) => o.entityId === key);

    if (entityObs.length > 0) {
      sections.push(`### ${scored.entity.type} "${scored.entity.name}"`);

      for (const obs of entityObs) {
        const metaEntries = Object.entries(obs.metadata)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .slice(0, 8)
          .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          .join(', ');

        sections.push(
          `- [${obs.severity.toUpperCase()}] ${obs.description} (type=${obs.type}, score=${
            obs.score
          }/100, confidence=${(obs.confidence * 100).toFixed(0)}%${
            metaEntries ? `, ${metaEntries}` : ''
          })`
        );
      }
    }
  }

  return sections.join('\n');
};

/**
 * Use an LLM to synthesize lead content from scored entities and their observations.
 * Throws on failure so the caller can fall back to rule-based synthesis.
 */
export const llmSynthesizeLeadContent = async (
  chatModel: InferenceChatModel,
  group: ScoredEntityInput[],
  observations: Observation[],
  logger: Logger
): Promise<LlmSynthesisResult> => {
  const entitySummary = formatEntitySummary(group);
  const observationsSummary = formatObservationsSummary(group, observations);

  const jsonParser = new JsonOutputParser<LlmSynthesisResult>();
  const chain = synthesisPrompt.pipe(chatModel).pipe(jsonParser);

  logger.debug('[LeadGenerationEngine] Invoking LLM for lead content synthesis');

  const result = await chain.invoke({
    entity_summary: entitySummary,
    observations_summary: observationsSummary,
  });

  if (
    typeof result.title !== 'string' ||
    typeof result.description !== 'string' ||
    !Array.isArray(result.tags) ||
    !Array.isArray(result.recommendations)
  ) {
    throw new Error('LLM returned malformed JSON: missing required fields');
  }

  const truncatedTitle = truncateTitle(result.title, 5);

  return {
    title: truncatedTitle,
    description: stripMarkdown(result.description),
    tags: result.tags
      .map(String)
      .filter((t) => !/^T\d{4}(\.\d{3})?$/i.test(t.trim()))
      .slice(0, 6),
    recommendations: result.recommendations.map(String).slice(0, 5),
  };
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
