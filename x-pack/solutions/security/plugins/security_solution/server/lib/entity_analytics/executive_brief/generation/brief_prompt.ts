/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { STORY_EDGE_CONFIG } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefNarrationMode,
  BriefSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { buildEntityIndex, escapeRegExp } from '../validation/entity_mentions';

/** PoC prompt v0 (POC-PLAN section 5.4). Hard-coded; becomes a prompt registry entry later. */
export const BRIEF_SYSTEM_PROMPT = `You are a security analyst briefing a CISO. You are given a deterministic snapshot of an organisation's entity analytics data and must write an executive brief about it.

Rules:
- Use only facts present in the snapshot. Never add, merge or split storylines or entities.
- Every claim must cite the evidence ids it relies on in its "evidence" array. Cite only ids that appear in the snapshot (ENT-*, RULE-*, AD-*, LEAD-*, CASE-*, ANOM-*, TAC-*, GAP-*, STORY-*, EVT-*). A claim without a valid citation is discarded.
- Numbers must be copied from the snapshot. Never calculate, estimate or invent a number.
- Conclusions must connect at least two evidence items across entities, tactics or time, and say why it matters to the business (criticality, privilege, exposure).
- Decisions: concrete and owner-tagged, at most 5, ordered by urgency. Each relates to a STORY-*, GAP-* or TAC-* id.
- Lower your confidence when the snapshot lists data gaps (sources that are not "ok").
- Use plain language. Do not write MITRE ATT&CK ids (TAxxxx, Txxxx) in prose; they belong in the evidence arrays.
- Storylines: narrate only the computed storylines, one entry per storyline. Describe each relation between two entities ONLY with the exact "allowedVerb" of the edge that links them, and never imply a link between two entities that have no edge. Do not say "moved laterally", "pivoted", "compromised" or similar unless an edge or cited rule backs it. Say how strongly the storyline is linked (linkStrength), give "why it matters" from criticality, privilege and exposure, and state the response status plainly (for example "no one is working this yet").
- Write at most one sentence that mentions two entities, and only when an edge links them.
- Give one cross-storyline conclusion only if it is supported by shared entities or a blind spot; otherwise omit it.
- Coverage findings must cite a TAC-* id, must say "detection coverage" (never "protected" or "defended"), and should mention data gaps such as unmapped alerts or missing integrations.`;

const EVIDENCE_ARRAY = {
  type: 'array',
  description:
    'Evidence ids (ENT-*, RULE-*, AD-*, LEAD-*, CASE-*, ANOM-*, TAC-*, GAP-*, STORY-*, EVT-*)',
  items: { type: 'string' },
} as const;

const CONFIDENCE = { type: 'string', enum: ['high', 'medium', 'low'] } as const;

/** JSON schema mirroring `ExecutiveBrief`. */
export const BRIEF_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    glance: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: 'One sentence' },
        threatNarrative: { type: 'string', description: 'Two to four sentences' },
        evidence: EVIDENCE_ARRAY,
      },
      required: ['headline', 'threatNarrative', 'evidence'],
    },
    storylines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          storylineId: { type: 'string', description: 'The STORY-* id from the snapshot' },
          title: { type: 'string' },
          narrative: { type: 'string' },
          whyItMatters: { type: 'string' },
          confidence: CONFIDENCE,
          evidence: EVIDENCE_ARRAY,
        },
        required: ['storylineId', 'title', 'narrative', 'whyItMatters', 'confidence', 'evidence'],
      },
    },
    crossStorylineConclusion: {
      type: 'object',
      description: 'Optional; omit unless supported by shared entities or a blind spot',
      properties: {
        statement: { type: 'string' },
        confidence: CONFIDENCE,
        evidence: EVIDENCE_ARRAY,
      },
      required: ['statement', 'confidence', 'evidence'],
    },
    blindSpots: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        evidence: EVIDENCE_ARRAY,
      },
      required: ['summary', 'evidence'],
    },
    decisions: {
      type: 'array',
      description: 'At most 5, ordered by urgency',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          rationale: { type: 'string' },
          urgency: { type: 'string', enum: ['now', 'this_week', 'next_review'] },
          owner: {
            type: 'string',
            enum: ['soc', 'it', 'iam', 'cloud', 'detection_engineering', 'leadership'],
          },
          relatesTo: { type: 'string', description: 'A STORY-*, GAP-* or TAC-* id' },
          targets: EVIDENCE_ARRAY,
          evidence: EVIDENCE_ARRAY,
          agentPrompt: {
            type: 'string',
            description: 'A prompt an analyst can hand to an AI agent to investigate this decision',
          },
        },
        required: [
          'action',
          'rationale',
          'urgency',
          'relatesTo',
          'targets',
          'evidence',
          'agentPrompt',
        ],
      },
    },
  },
  required: ['glance', 'storylines', 'blindSpots', 'decisions'],
} as const satisfies ToolSchema;

/** Replaces every entity display name, euid and alias in `text` with its ENT id. */
const createRedactor = (snapshot: BriefSnapshot): ((text: string) => string) => {
  const index = buildEntityIndex(snapshot);
  const replacements = new Map<string, string>();
  Object.values(snapshot.entities).forEach((entity) => {
    [entity.name, entity.euid, ...entity.aliases].forEach((surface) => {
      if (surface.length >= 2) {
        replacements.set(surface.toLowerCase(), entity.evidenceId);
      }
    });
  });
  const surfaces = index.surfaceForms.filter((surface) => replacements.has(surface));
  if (surfaces.length === 0) {
    return (text) => text;
  }
  const pattern = new RegExp(
    `(?<![\\w.-])(?:${surfaces.map(escapeRegExp).join('|')})(?![\\w@-]|\\.\\w)`,
    'gi'
  );
  return (text) => text.replace(pattern, (match) => replacements.get(match.toLowerCase()) ?? match);
};

/**
 * The generator input. Entities are always referenced by ENT id; euids are never included
 * because they embed names. In `ids_only` mode names are removed from every string too.
 */
export const buildBriefPayload = (snapshot: BriefSnapshot, mode: BriefNarrationMode): string => {
  const redact = mode === 'ids_only' ? createRedactor(snapshot) : (text: string) => text;
  const ref = (euid: string): string => snapshot.entities[euid]?.evidenceId ?? 'ENT-unknown';

  const entities = Object.values(snapshot.entities).map((entity) => ({
    id: entity.evidenceId,
    ...(mode === 'names' ? { name: entity.name } : {}),
    type: entity.type,
    riskLevel: entity.riskLevel,
    riskScore: entity.riskScoreNorm,
    criticality: entity.criticality,
    watchlists: entity.watchlists,
    isPrivileged: entity.isPrivileged,
    vulnerabilities: entity.vulnerabilities,
    isSharedInfrastructure: entity.isHub === true,
  }));

  // Entities, tactics, gaps, stories and events are described elsewhere in the payload.
  const catalog: Record<string, object> = {};
  Object.entries(snapshot.catalog).forEach(([id, entry]) => {
    switch (entry.kind) {
      case 'entity':
      case 'tactic':
      case 'gap':
      case 'story':
      case 'event':
        break;
      case 'rule':
        catalog[id] = { ...entry, ruleId: undefined, name: redact(entry.name) };
        break;
      case 'attack_discovery':
      case 'lead':
      case 'case':
        catalog[id] = { ...entry, title: redact(entry.title) };
        break;
      default:
        catalog[id] = entry;
    }
  });

  const storylines = snapshot.storylines.storylines.map((storyline) => ({
    id: storyline.evidenceId,
    rank: storyline.rank,
    severity: storyline.severity,
    linkStrength: storyline.linkStrength,
    entities: storyline.entityEuids.map(ref),
    sharedInfrastructure: storyline.hubEuids.map(ref),
    edges: storyline.edges.map((edge) => ({
      from: ref(edge.from),
      to: ref(edge.to),
      type: edge.type,
      allowedVerb: STORY_EDGE_CONFIG[edge.type].verb,
      evidence: edge.evidenceIds,
    })),
    events: storyline.events.map((event) => ({
      id: event.evidenceId,
      type: event.type,
      at: event.at,
      tacticId: event.tacticId,
      entities: event.entityEuids.map(ref),
      summary: redact(event.summary),
    })),
    eventsNotShown: storyline.eventsTruncated,
    tacticIds: storyline.tacticIds,
    response: {
      ...storyline.response,
      cases: storyline.response.cases.map((c) => ({ ...c, title: redact(c.title) })),
    },
  }));

  const dataGaps = Object.entries(snapshot.sources)
    .filter(([, source]) => source.status !== 'ok')
    .map(([source, { status, message }]) => ({
      source,
      status,
      message: message && redact(message),
    }));

  const payload = {
    timeRange: snapshot.timeRange,
    metrics: {
      stats: snapshot.glance.stats,
      needsAttention: snapshot.glance.needsAttention.map((tile) => ({
        ...tile,
        sample: tile.sample.map(ref),
      })),
      riskConcentration: snapshot.glance.concentration,
      exposureLeaders: snapshot.glance.exposureLeaders.map(ref),
    },
    entities,
    storylines,
    otherNotableEntities: snapshot.storylines.otherNotableEntities.map(ref),
    attackStages: snapshot.blindSpots.attackStages,
    blindSpotSignals: snapshot.blindSpots.gaps.map((gap) => ({
      ...gap,
      title: redact(gap.title),
      detail: gap.detail === undefined ? undefined : redact(gap.detail),
      entityEuids: undefined,
      entities: gap.entityEuids?.map(ref),
    })),
    evidenceCatalog: catalog,
    dataGaps,
  };

  return JSON.stringify(payload);
};
