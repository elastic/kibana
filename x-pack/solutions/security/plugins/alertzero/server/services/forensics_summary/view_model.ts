/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalStatus } from '@kbn/proposals-common';
import { proposalStatusSchema } from '@kbn/proposals-common';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  CLOSE_ATTACK_ACTION_WORKFLOW_ID,
  IOC_KINDS,
  KILL_CHAIN_TACTICS,
  MAX_ALERTS,
  MAX_IOCS_PER_KIND,
  MAX_TIMELINE_EVENTS,
} from './constants';
import type { ForensicsSummaryInputs } from './types';

const verdictSchema = lazySchema(() =>
  z.enum(['confirmed_incident', 'not_an_incident', 'unclear'])
);
const decisionGroupSchema = lazySchema(() =>
  z.enum(['awaiting', 'running', 'done', 'failed', 'closed'])
);
const severitySchema = lazySchema(() => z.enum(['critical', 'high', 'medium', 'low']));

export type ForensicsVerdict = z.infer<typeof verdictSchema>;
export type DecisionGroup = z.infer<typeof decisionGroupSchema>;
export type AlertSeverity = z.infer<typeof severitySchema>;

/** The renderer's input contract: what the card shows, already counted, capped and ordered. */
export const forensicsSummaryViewModelSchema = lazySchema(() =>
  z.object({
    version: z.literal(1),
    title: z.string(),
    /** The analyzed host, when the run resolved one. */
    host: z.string().optional(),
    attackTitle: z.string().optional(),
    verdict: verdictSchema,
    autonomy: z.string(),
    analyzedAt: z.string().optional(),
    summary: z.string().optional(),
    decisions: z.record(decisionGroupSchema, z.number().int().min(0)),
    peakRisk: z.object({ score: z.number(), severity: severitySchema }).optional(),
    scope: z.object({
      hosts: z.number().int().min(0),
      identities: z.number().int().min(0),
      network: z.number().int().min(0),
    }),
    killChain: z.array(z.object({ name: z.string(), short: z.string(), detected: z.boolean() })),
    proposals: z.array(
      z.object({
        title: z.string(),
        status: proposalStatusSchema,
        group: decisionGroupSchema,
        category: z.string(),
        impact: z.string().optional(),
        confidence: z.string().optional(),
        expiresAt: z.string().optional(),
        /** The proposal's comment as one line of plain text, while it awaits a decision. */
        comment: z.string().optional(),
        dismissed: z.boolean(),
        decidedBy: z.string().optional(),
        actionWorkflowId: z.string().optional(),
        /** The first Defend agent the action targets, and how many more it does. */
        agent: z.object({ id: z.string(), more: z.number().int().min(0) }).optional(),
      })
    ),
    timeline: z.object({
      events: z.array(
        z.object({ timestamp: z.string(), host: z.string(), description: z.string() })
      ),
      total: z.number().int().min(0),
      window: z.object({ start: z.string(), end: z.string() }).optional(),
    }),
    indicators: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        color: z.number().int().min(0),
        count: z.number().int().min(0),
        values: z.array(z.string()),
      })
    ),
    alerts: z.object({
      total: z.number().int().min(0),
      shown: z.array(
        z.object({
          ruleName: z.string(),
          severity: severitySchema,
          riskScore: z.number(),
          timestamp: z.string().optional(),
        })
      ),
      /** A pending close reaches every alert of the attack, so the section opens under it. */
      closePending: z.boolean(),
    }),
  })
);

export type ForensicsSummaryViewModel = z.infer<typeof forensicsSummaryViewModelSchema>;

const DECISION_GROUP_BY_STATUS: Record<ProposalStatus, DecisionGroup> = {
  pending: 'awaiting',
  executing: 'running',
  succeeded: 'done',
  failed: 'failed',
  no_action: 'closed',
  expired: 'closed',
  superseded: 'closed',
};

/** Open decisions first, then the settled ones in the order the proposals were read. */
const DECISION_GROUP_ORDER: readonly DecisionGroup[] = [
  'awaiting',
  'running',
  'failed',
  'done',
  'closed',
];

/** Urgent containment first; categories outside these follow in the order they were read. */
const CATEGORY_ORDER: readonly string[] = ['respond', 'investigate'];

const categoryRank = (category: string): number => {
  const rank = CATEGORY_ORDER.indexOf(category);
  return rank === -1 ? CATEGORY_ORDER.length : rank;
};

const MAX_COMMENT_LENGTH = 200;

/** A markdown comment as one line of plain text: tags, emphasis, code ticks and heading marks dropped. */
const toPlainComment = (comment: string | undefined): string | undefined => {
  const plain = comment
    ?.slice(0, MAX_COMMENT_LENGTH * 4)
    .replace(/<[^>]{0,256}>/g, ' ')
    .replace(/[*`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) {
    return undefined;
  }
  return plain.length > MAX_COMMENT_LENGTH
    ? `${plain.slice(0, MAX_COMMENT_LENGTH - 1).trimEnd()}…`
    : plain;
};

const endpointIdsSchema = lazySchema(() => z.object({ endpoint_ids: z.array(z.string()).min(1) }));

const toAgent = (actionInput: Record<string, unknown> | undefined) => {
  const parsed = endpointIdsSchema.safeParse(actionInput);
  if (!parsed.success) {
    return undefined;
  }
  const [id, ...rest] = parsed.data.endpoint_ids;
  return { id, more: rest.length };
};

const toVerdict = (value: string | undefined): ForensicsVerdict => {
  const parsed = verdictSchema.safeParse(value);
  return parsed.success ? parsed.data : 'unclear';
};

const toSeverity = (value: string): AlertSeverity => {
  const parsed = severitySchema.safeParse(value);
  return parsed.success ? parsed.data : 'low';
};

const ANONYMIZED_VALUE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
/** `{{ field value }}`, on one line. Bounded, so a malformed title cannot make it backtrack far. */
const FIELD_TOKEN = /\{\{ ?[^\s{}]{1,256} ([^{}\n]{1,512}?) ?\}\}/g;
const MAX_ATTACK_TITLE_LENGTH = 300;

/** The attack's title as plain text: field tokens shown as their value, anonymized values restored. */
export const toPlainAttackTitle = (
  title: string,
  replacements?: Record<string, string>
): string => {
  const rendered = title.slice(0, MAX_ATTACK_TITLE_LENGTH).replace(FIELD_TOKEN, '$1');
  return replacements
    ? rendered.replace(ANONYMIZED_VALUE, (value) => replacements[value] ?? value)
    : rendered;
};

/** Builds what the card shows from what was read; pure, so the card is the same for the same inputs. */
export const buildForensicsSummaryViewModel = (
  inputs: ForensicsSummaryInputs
): ForensicsSummaryViewModel => {
  const { attack, timeline, iocs = {}, proposals, alerts } = inputs;
  const events = timeline?.events ?? [];
  const host = events[0]?.host || iocs.affected_hosts?.[0]?.value || undefined;
  const attackTitle = attack?.title || undefined;

  const decisions: Record<DecisionGroup, number> = {
    awaiting: 0,
    running: 0,
    done: 0,
    failed: 0,
    closed: 0,
  };
  const groupedProposals = proposals.map((proposal) => {
    const group = DECISION_GROUP_BY_STATUS[proposal.status];
    decisions[group] += 1;
    return { proposal, group };
  });
  const sortedProposals = DECISION_GROUP_ORDER.flatMap((order) =>
    groupedProposals.filter(({ group }) => group === order)
  )
    .map(({ proposal, group }) => ({ proposal, group, category: proposal.category || 'other' }))
    // A stable sort, so each category keeps its open decisions first.
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category))
    .map(({ proposal, group, category }) => {
      const isOpen = group === 'awaiting' || group === 'running';
      return {
        title: proposal.title,
        status: proposal.status,
        group,
        category,
        impact: proposal.impact,
        confidence: proposal.confidence,
        expiresAt: group === 'awaiting' ? proposal.expiresAt : undefined,
        comment: isOpen ? toPlainComment(proposal.comment) : undefined,
        dismissed: proposal.decision === 'dismissed',
        decidedBy: isOpen ? undefined : proposal.decidedBy?.username || undefined,
        actionWorkflowId: proposal.actionWorkflowId,
        agent: toAgent(proposal.actionInput),
      };
    });

  const rankedAlerts = [...alerts].sort((a, b) => b.riskScore - a.riskScore);
  const peak = rankedAlerts[0];

  const detected = new Set(attack?.tactics ?? []);
  const killChain = detected.size
    ? KILL_CHAIN_TACTICS.map(({ name, short }) => ({ name, short, detected: detected.has(name) }))
    : [];

  const hosts = iocs.affected_hosts?.length || (host ? 1 : 0);

  return {
    version: 1,
    title: host ?? attackTitle ?? 'Endpoint analysis',
    host,
    attackTitle: host ? attackTitle : undefined,
    verdict: toVerdict(inputs.verdict),
    autonomy: inputs.autonomy || 'manual',
    analyzedAt: inputs.analyzedAt,
    summary: inputs.summary?.trim() || undefined,
    decisions,
    peakRisk: peak ? { score: peak.riskScore, severity: toSeverity(peak.severity) } : undefined,
    scope: {
      hosts,
      identities: iocs.compromised_identities?.length ?? 0,
      network: iocs.ips?.length ?? 0,
    },
    killChain,
    proposals: sortedProposals,
    timeline: {
      events: events
        .slice(0, MAX_TIMELINE_EVENTS)
        .map(({ timestamp, host: eventHost, description }) => ({
          timestamp,
          host: eventHost,
          description,
        })),
      total: events.length,
      window: timeline?.window,
    },
    indicators: IOC_KINDS.flatMap(({ key, label, color }) => {
      const values = iocs[key] ?? [];
      return values.length
        ? [
            {
              key,
              label,
              color,
              count: values.length,
              values: values.slice(0, MAX_IOCS_PER_KIND).map(({ value }) => value),
            },
          ]
        : [];
    }),
    alerts: {
      total: attack?.alertIds.length ?? 0,
      shown: rankedAlerts
        .slice(0, MAX_ALERTS)
        .map(({ ruleName, severity, riskScore, timestamp }) => ({
          ruleName,
          severity: toSeverity(severity),
          riskScore,
          timestamp,
        })),
      closePending: proposals.some(
        ({ actionWorkflowId, status }) =>
          actionWorkflowId === CLOSE_ATTACK_ACTION_WORKFLOW_ID && status === 'pending'
      ),
    },
  };
};

/** How many decisions are still open: awaiting an analyst or running. */
export const countOpenDecisions = ({ decisions }: ForensicsSummaryViewModel): number =>
  decisions.awaiting + decisions.running;
