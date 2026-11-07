/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSeverity } from './hooks/use_entity_relationships';

/**
 * Shared "AI explain" contract for the Explorer graph and causal timeline.
 *
 * The model returns a compact, labeled-line payload the UI turns into its own
 * lightweight graphics (an attack-chain ribbon, key-entity chips, tactic chips,
 * a "what to investigate next" checklist, a confidence pill) — not a wall of
 * prose. Everything here is pure so the prompt assembly + parsing is
 * deterministic and unit-testable; the React hook/view only orchestrate.
 */

export type ExplainConfidence = 'high' | 'medium' | 'low';

/** Optional reference to a graph entity for click-to-focus interactivity. */
export interface ExplainEntityRef {
  name: string;
  kind: string | undefined;
}

/** One node on the rendered attack-flow diagram. */
export interface ExplainChainStep {
  label: string;
  severity: AlertSeverity | undefined;
  /** Grounding evidence for this step (rule / technique / entity), if given. */
  evidence: string | undefined;
}

/** A key entity the model calls out (rendered as a clickable chip). */
export interface ExplainEntity {
  name: string;
  kind: string | undefined;
}

/** Kind of action a "next step" maps to, driving a real control in the UI. */
export type ExplainActionKind = 'hunt' | 'alerts' | 'focus' | 'none';

/** A recommended next step, optionally actionable (hunt / alerts pivot / focus). */
export interface ExplainAction {
  label: string;
  action: ExplainActionKind;
  /** Target entity name for hunt/alerts/focus actions, when applicable. */
  targetName: string | undefined;
  /** Target entity kind (user|host|service|ip), when applicable. */
  targetKind: string | undefined;
  /** MITRE technique/tactic for an alerts pivot, when applicable. */
  targetTechnique: string | undefined;
}

export interface AiExplainResult {
  summary: string;
  /** Explicit assessment: is this an attack, what stage, likely intent. */
  assessment: string | undefined;
  chain: ExplainChainStep[];
  entities: ExplainEntity[];
  tactics: string[];
  actions: ExplainAction[];
  /** Rationale for the severity call. */
  severityRationale: string | undefined;
  confidence: ExplainConfidence | undefined;
}

const ACTION_VALUES: readonly ExplainActionKind[] = ['hunt', 'alerts', 'focus', 'none'];
const SEVERITY_VALUES: readonly AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
const CONFIDENCE_VALUES: readonly ExplainConfidence[] = ['high', 'medium', 'low'];

const isActionKind = (value: string): value is ExplainActionKind =>
  (ACTION_VALUES as readonly string[]).includes(value);

const isSeverity = (value: string): value is AlertSeverity =>
  (SEVERITY_VALUES as readonly string[]).includes(value);

const isConfidence = (value: string): value is ExplainConfidence =>
  (CONFIDENCE_VALUES as readonly string[]).includes(value);

/**
 * Output-format instructions appended to every explain prompt. Kept terse and
 * label-based (same philosophy as the dossier insight) so the model returns
 * structured data the UI can render as graphics, and so it is trivial + robust
 * to parse. Grounding rules forbid inventing specifics.
 */
export const AI_EXPLAIN_FORMAT_INSTRUCTIONS = [
  'Reason carefully and produce an analyst-grade result. Ground every statement ONLY in the CONTEXT provided below. Never invent entity names, counts, rule names, IPs, or MITRE techniques that are not present in the context. If you cannot support a section, omit it entirely.',
  'Respond ONLY with labeled lines in exactly this format — no preamble, no markdown, no closing paragraph:',
  'SUMMARY: <2-3 sentence plain-language explanation of what this cluster/timeline represents and the likely story>',
  'ASSESSMENT: <1-2 sentences: is this a likely attack? which stage/kill-chain phase, and the likely intent — grounded in the context>',
  'STEP: <short past-tense step in the progression, 10 words max> | <severity: critical|high|medium|low or blank> | <grounding evidence: a rule name, MITRE technique, entity, or IP from the context, or blank> (repeat STEP: in chronological/causal order for up to 8 steps; omit if there is no ordered progression)',
  'ENTITY: <entity name> | <kind: user|host|service|ip or blank> (repeat ENTITY: for up to 8 pivotal entities named in the context)',
  'TACTIC: <MITRE tactic or technique named in the context> (repeat TACTIC:; omit if none in context)',
  'RATIONALE: <one sentence justifying the overall severity, grounded in the context>',
  'ACTION: <concrete next investigative step, imperative, 12 words max> | <one of: hunt|alerts|focus|none> | <target entity name or MITRE technique from the context, or blank> | <target kind: user|host|service|ip or blank> (repeat ACTION: for 2-5 steps. Use hunt to launch an AI hunt of an entity, alerts to pivot to alerts filtered by entity or technique, focus to center a graph node, none for non-actionable advice)',
  'CONFIDENCE: <high|medium|low>',
].join('\n');

const cleanLine = (line: string): string =>
  line
    .replace(/^[-*•\s]+/, '')
    .replace(/\*\*/g, '')
    .trim();

/** Splits a value on `|` into up to `parts` trimmed segments (undefined when empty). */
const splitPipes = (value: string, parts: number): Array<string | undefined> => {
  const segments = value.split('|').map((segment) => segment.trim());
  const result: Array<string | undefined> = [];
  for (let index = 0; index < parts; index++) {
    const segment = segments[index];
    result.push(segment !== undefined && segment !== '' ? segment : undefined);
  }
  return result;
};

/**
 * Parses the labeled-line explain payload into the structured, view-ready
 * result. Tolerant of partial/streaming text: strips list/bold markers and
 * stray fences, folds SUMMARY/ASSESSMENT continuation lines, and ignores
 * unknown labels. Returns undefined when there is no usable summary (callers
 * then fall back to markdown / a plain message).
 */
export const parseAiExplain = (raw: string): AiExplainResult | undefined => {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const summaryParts: string[] = [];
  const assessmentParts: string[] = [];
  const chain: ExplainChainStep[] = [];
  const entities: ExplainEntity[] = [];
  const tactics: string[] = [];
  const actions: ExplainAction[] = [];
  let severityRationale: string | undefined;
  let confidence: ExplainConfidence | undefined;

  let activeLabel: string | undefined;
  for (const rawLine of raw.split('\n')) {
    const line = cleanLine(rawLine).replace(/^`{3,}\w*$/, '');
    if (line !== '') {
      const match = line.match(
        /^(SUMMARY|ASSESSMENT|STEP|ENTITY|TACTIC|RATIONALE|ACTION|NEXT|CONFIDENCE)S?\s*:\s*(.*)$/i
      );
      if (match) {
        activeLabel = match[1].toUpperCase();
        const value = match[2].trim();
        if (value !== '') {
          if (activeLabel === 'SUMMARY') {
            summaryParts.push(value);
          } else if (activeLabel === 'ASSESSMENT') {
            assessmentParts.push(value);
          } else if (activeLabel === 'STEP') {
            const [label, sevRaw, evidence] = splitPipes(value, 3);
            const sev = sevRaw?.toLowerCase();
            if (label !== undefined) {
              chain.push({
                label,
                severity: sev && isSeverity(sev) ? sev : undefined,
                evidence,
              });
            }
          } else if (activeLabel === 'ENTITY') {
            const [name, kind] = splitPipes(value, 2);
            if (name !== undefined) entities.push({ name, kind: kind?.toLowerCase() });
          } else if (activeLabel === 'TACTIC') {
            tactics.push(value);
          } else if (activeLabel === 'RATIONALE') {
            severityRationale = severityRationale ?? value;
          } else if (activeLabel === 'ACTION' || activeLabel === 'NEXT') {
            // ACTION carries pipes; the legacy NEXT is a plain label.
            const [label, actionRaw, target, kind] = splitPipes(value, 4);
            if (label !== undefined) {
              const actionKind = actionRaw?.toLowerCase();
              actions.push({
                label,
                action: actionKind && isActionKind(actionKind) ? actionKind : 'none',
                targetName: target,
                targetKind: kind?.toLowerCase(),
                targetTechnique:
                  actionKind === 'alerts' && target && /^t\d/i.test(target) ? target : undefined,
              });
            }
          } else if (activeLabel === 'CONFIDENCE') {
            const candidate = value.toLowerCase();
            confidence = isConfidence(candidate) ? candidate : undefined;
          }
        }
      } else if (activeLabel === 'SUMMARY') {
        summaryParts.push(line);
      } else if (activeLabel === 'ASSESSMENT') {
        assessmentParts.push(line);
      }
    }
  }

  const summary = summaryParts.join(' ').trim();
  if (summary === '') return undefined;
  const assessment = assessmentParts.join(' ').trim();
  return {
    summary,
    assessment: assessment === '' ? undefined : assessment,
    chain,
    entities,
    tactics,
    actions,
    severityRationale,
    confidence,
  };
};

/** Neighbor summary for the graph explain context. */
export interface GraphExplainNeighbor {
  name: string;
  kind: string;
  alertCount: number;
  worstSeverity: AlertSeverity | undefined;
  /** Human relationship phrase from the event-context (e.g. "spawned process bash"). */
  activity: string | undefined;
}

/** A detection rule (+ optional MITRE tactic) observed on the focus entity. */
export interface GraphExplainAlertRule {
  ruleName: string;
  severity: AlertSeverity | undefined;
  tactic: string | undefined;
}

export interface GraphExplainContext {
  focusName: string;
  focusKind: string;
  timeRange: string;
  neighbors: readonly GraphExplainNeighbor[];
  /** Distinct detection rules on the focus entity, for grounding + depth. */
  alertRules: readonly GraphExplainAlertRule[];
}

/** One timeline step condensed for the explain context. */
export interface TimelineExplainStep {
  time: string;
  kind: 'alert' | 'event';
  label: string;
  category: string | undefined;
  severity: AlertSeverity | undefined;
  tactic: string | undefined;
  tiedToAlert: boolean;
  depth: number;
}

export interface TimelineExplainContext {
  focusName: string;
  focusKind: string;
  timeRange: string;
  totalSignificant: number;
  steps: readonly TimelineExplainStep[];
}

const indent = (depth: number): string => '  '.repeat(Math.max(0, Math.min(depth, 4)));

/**
 * Builds the graph "explain this cluster" prompt from the current focus entity,
 * its placed neighbors (types, shared-alert counts, worst severity, and the
 * real event-activity phrase), and the time range. Pure and deterministic.
 */
export const buildGraphExplainPrompt = (context: GraphExplainContext): string => {
  const neighborLines =
    context.neighbors.length > 0
      ? context.neighbors
          .map((neighbor) => {
            const severity = neighbor.worstSeverity
              ? `, worst severity ${neighbor.worstSeverity}`
              : '';
            const activity = neighbor.activity ? `, activity: ${neighbor.activity}` : '';
            return `- ${neighbor.kind} "${neighbor.name}" (${neighbor.alertCount} shared alerts${severity}${activity})`;
          })
          .join('\n')
      : '- (no related entities placed on the graph yet)';

  const ruleLines =
    context.alertRules.length > 0
      ? context.alertRules
          .map((rule) => {
            const severity = rule.severity ? ` [${rule.severity}]` : '';
            const tactic = rule.tactic ? ` {tactic: ${rule.tactic}}` : '';
            return `- ${rule.ruleName}${severity}${tactic}`;
          })
          .join('\n')
      : '- (no detection rules on the focus entity in this window)';

  return [
    'You are a senior SOC analyst helping someone understand a security relationship graph.',
    'Think step by step about what this cluster of entities represents: is it a plausible attack chain? Reconstruct the most likely progression, tie each step to grounding evidence, assess the stage and likely intent, and recommend concrete next actions.',
    '',
    'CONTEXT',
    `Focus entity: ${context.focusKind} "${context.focusName}"`,
    `Time range: last ${context.timeRange}`,
    'Related entities (from shared detection alerts and real event activity):',
    neighborLines,
    'Detection rules on the focus entity (with severity and MITRE tactic where known):',
    ruleLines,
    '',
    AI_EXPLAIN_FORMAT_INSTRUCTIONS,
  ].join('\n');
};

/**
 * Builds the timeline "explain this story" prompt from the grouped/significant
 * steps for the focus entity (labels, categories, timestamps, alert linkage,
 * MITRE tactics, and the causal indentation depth). Pure and deterministic.
 */
export const buildTimelineExplainPrompt = (context: TimelineExplainContext): string => {
  const stepLines =
    context.steps.length > 0
      ? context.steps
          .map((step) => {
            const marker = step.kind === 'alert' ? 'ALERT' : step.category ?? 'event';
            const severity = step.severity ? ` [${step.severity}]` : '';
            const tactic = step.tactic ? ` {tactic: ${step.tactic}}` : '';
            const tied = step.tiedToAlert ? ' (tied to an alert)' : '';
            return `${indent(step.depth)}- ${step.time} ${marker}: ${
              step.label
            }${severity}${tactic}${tied}`;
          })
          .join('\n')
      : '- (no significant steps)';

  return [
    'You are a senior SOC analyst narrating a causal security timeline for an entity.',
    'Think step by step: reconstruct the causal story these significant events and alerts tell, tie each progression step to grounding evidence, call out the pivotal moments (initial access, escalation, lateral movement, impact), assess the stage and likely intent, and recommend concrete next actions — using only what is shown.',
    '',
    'CONTEXT',
    `Focus entity: ${context.focusKind} "${context.focusName}"`,
    `Time range: last ${context.timeRange}`,
    `Significant steps: ${context.totalSignificant} (indentation shows causal progression)`,
    stepLines,
    '',
    AI_EXPLAIN_FORMAT_INSTRUCTIONS,
  ].join('\n');
};
