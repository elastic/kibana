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

export interface ScoredEntityInput {
  readonly entity: LeadEntity;
  readonly priority: number;
  readonly observations: Observation[];
}

export interface LlmSynthesisResult {
  readonly title: string;
  readonly byline: string;
  readonly description: string;
  readonly tags: string[];
  readonly recommendations: string[];
}

/**
 * Cross-entity ("peer") context for the batch. Lets a lead's narrative convey
 * scope — e.g. how many other candidate entities share the same signal — so an
 * analyst can tell an isolated event from a coordinated pattern. Computed by the
 * engine (see `computeCohortContext`) and rendered per lead in the payload.
 */
export interface CohortContext {
  /** Total number of candidate entities in this generation batch. */
  readonly totalCandidates: number;
  /** For each observation type, how many distinct entities exhibit it. */
  readonly entityCountByObservationType: Readonly<Record<string, number>>;
}

/** Max distinct shared signals rendered in a lead's peer-context line. */
const MAX_PEER_SIGNALS = 3;

/** Upper bound on title length (words). Titles are full hypotheses, not labels. */
const TITLE_MAX_WORDS = 10;

const BATCH_SYNTHESIS_PROMPT = `You are a senior security analyst writing threat hunting leads for a SOC team. Each lead covers a single entity. This feature pre-selects the top candidates worth a threat hunter's time, so the title and byline must let an analyst instantly decide whether and why to prioritize this lead — not restate the raw alert or rule name.

Rules:
- Write as if briefing a colleague who knows nothing about this entity yet
- The title is a specific, prioritizable HYPOTHESIS, not a category label. It must combine three things: (1) the behavior or what happened, (2) an entity qualifier that conveys stakes (privileged, high-criticality, service account, admin, unfamiliar/new), and (3) when useful, why now (a timeframe, escalation, or "after hours").
- If the data is thin (e.g. one alert), say what that signal typically indicates and why it still warrants attention for THIS entity given their role or criticality
- Reference the entity's asset criticality and privilege status where present — a single MFA failure from a privileged admin is very different from one on a standard user
- Never pad with generic security advice; every sentence must be grounded in the specific data provided
- Vary titles across leads — do not reuse the same phrasing
- When a lead includes "Peer context" (other candidate entities sharing the same signal), you may reference it in the byline or description to convey scope — e.g. "alongside 5 other privileged accounts escalating in the same window". Only use peer counts that are provided; never invent them.
- Never mention, quote, or paraphrase the \`signal_strength\` value anywhere (title, byline, description, tags). It is an internal ranking signal, not something meaningful to an analyst, and must not be shown.
- Only state a numeric risk score when a "Risk escalation" line is present for that lead; use exactly the from/to numbers and window given, and never invent, estimate, or restate a risk score from any other field (including \`signal_strength\`). If no "Risk escalation" line is present, do not mention a risk score at all.

You will receive data for {lead_count} lead(s). Respond ONLY with a valid JSON array (no markdown fences, no extra text) containing exactly {lead_count} objects in the same order as the input, each matching this schema:
{{
  "title": "string - a 5 to 9 word hypothesis combining behavior + entity qualifier + (when useful) why-now. Do NOT restate a detection rule name. Good: 'Rapid risk score escalation across privileged account', 'Anomalous access to unfamiliar hosts after hours', 'Privileged service account showing unusual resource usage', 'Credential attempts against unmanaged critical host'. Bad: 'Okta MFA Verification Failure' (rule name), 'Suspicious activity' (vague label), 'Credential access attempt' (no entity stakes or why-now).",
  "byline": "string - one sentence, roughly 15 to 25 words, plain text, no markdown. Start with the entity's name exactly as given in the input, then lead with the single strongest quantified signal and its timeframe, and note the stakes (role/criticality) if relevant. It must stand alone without the title or description. Good: 'admin-1 had a risk score spike above 20% in the last day, alongside escalations on other privileged accounts.', 'john-doe accessed 2 unfamiliar hosts outside usual patterns in the last 24h, indicating possible lateral movement.'. Bad: 'with 2 alerts in the last 7 days' (no what/why), 'showed suspicious behavior' (not quantified).",
  "description": "string - 2 to 4 sentences, plain text, no markdown. Explain: (1) what the evidence shows with specific scores/counts/rule names, (2) why this entity specifically warrants investigation (their role, criticality, or the pattern), (3) what an attacker might be doing. If data is limited, explain why this signal still matters.",
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

/**
 * Builds a "Peer context" line for a lead: for each observation type present in
 * the group, how many OTHER candidate entities share it. Returns an empty string
 * when no peers share any of the lead's signals.
 */
const formatPeerContext = (group: ScoredEntityInput[], cohort?: CohortContext): string => {
  if (!cohort) return '';

  const groupTypes = new Set(group.flatMap((s) => s.observations.map((o) => o.type)));
  const peerSignals = [...groupTypes]
    .map((type) => ({ type, peers: (cohort.entityCountByObservationType[type] ?? 1) - 1 }))
    .filter(({ peers }) => peers > 0)
    .sort((a, b) => b.peers - a.peers)
    .slice(0, MAX_PEER_SIGNALS)
    .map(({ type, peers }) => `${peers} other entit${peers === 1 ? 'y' : 'ies'} share "${type}"`);

  if (peerSignals.length === 0) return '';
  return `  Peer context: ${peerSignals.join('; ')} (of ${cohort.totalCandidates} candidates).`;
};

/**
 * Risk escalation observation types considered "short window" — recent enough
 * that a jump is a meaningful why-now signal rather than gradual drift.
 * `risk_escalation_90d` is intentionally excluded.
 */
const SHORT_WINDOW_ESCALATION_TYPES = new Set(['risk_escalation_24h', 'risk_escalation_7d']);

/**
 * Builds an explicit, deterministic "Risk escalation" line from the risk
 * module's own before/after numbers when a short-window escalation
 * observation is present. This is the ONLY sanctioned source of a risk score
 * in the prompt — see the corresponding prompt rule — so the LLM never has
 * to infer or invent one from an unrelated observation's signal strength.
 */
const formatRiskEscalation = (group: ScoredEntityInput[]): string => {
  const escalation = group
    .flatMap((s) => s.observations)
    .filter((o) => SHORT_WINDOW_ESCALATION_TYPES.has(o.type))
    .sort((a, b) => Number(b.metadata.delta ?? 0) - Number(a.metadata.delta ?? 0))[0];
  if (!escalation) return '';

  const previousScore = Number(escalation.metadata.previous_score);
  const currentScore = Number(escalation.metadata.current_score);
  const delta = Number(escalation.metadata.delta);
  const window = escalation.metadata.window;
  if (Number.isNaN(previousScore) || Number.isNaN(currentScore) || Number.isNaN(delta)) return '';

  return `  Risk escalation: risk score rose from ${Math.round(previousScore)} to ${Math.round(
    currentScore
  )} (+${Math.round(delta)}) over the last ${window}.`;
};

const formatLeadsPayload = (groups: ScoredEntityInput[][], cohort?: CohortContext): string => {
  return groups
    .map((group, i) => {
      const entityLines = group.map(formatEntityLine).join('\n');

      const obsLines = group
        .flatMap((s) => {
          const key = s.entity.id;
          return s.observations
            .filter((o) => o.entityId === key)
            .map((obs) => {
              const metaEntries = Object.entries(obs.metadata)
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                .join(', ');
              return `  - [${obs.severity.toUpperCase()}] ${obs.description} (type=${
                obs.type
              }, signal_strength=${obs.score}/100${metaEntries ? `, ${metaEntries}` : ''})`;
            });
        })
        .join('\n');

      const header =
        group.length > 1
          ? `### Lead ${i + 1} — Campaign (${group.length} entities)`
          : `### Lead ${i + 1} — Single entity`;
      const riskEscalation = formatRiskEscalation(group);
      const peerContext = formatPeerContext(group, cohort);
      return [header, entityLines, obsLines, riskEscalation, peerContext]
        .filter(Boolean)
        .join('\n');
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
  logger: Logger,
  cohort?: CohortContext
): Promise<LlmSynthesisResult[]> => {
  if (groups.length === 0) return [];

  const leadsPayload = formatLeadsPayload(groups, cohort);
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
      typeof result.byline !== 'string' ||
      typeof result.description !== 'string' ||
      !Array.isArray(result.tags) ||
      !Array.isArray(result.recommendations)
    ) {
      throw new Error('LLM returned malformed JSON: missing required fields in batch item');
    }
    return {
      title: truncateTitle(result.title, TITLE_MAX_WORDS),
      byline: stripMarkdown(result.byline),
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

/** Exported for unit testing. */
export const __testables = {
  formatLeadsPayload,
  formatRiskEscalation,
};
