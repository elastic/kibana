/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EngineEvent, EvidenceResult } from '../../../common';
import { getErrorMessage } from '../errors';
import { queryRows, type EsqlRow } from '../esql';
import type { JoinProposal } from '../pipeline/join_proposals';
import type { AgentCase, CaseSignal, CaseEvidence } from './types';

/** Rows per evidence item the agent sees; enough to judge, small enough to bound tokens. */
export const ROWS_PER_EVIDENCE = 5;
const MAX_EVENT_EVIDENCE = 2;

/** Longest cell value the agent sees; a stack trace in one log line would crowd out the case. */
const MAX_CELL_LENGTH = 500;
const EVIDENCE_TIMEOUT_MS = 20_000;

function trimRow(row: EsqlRow): EsqlRow {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([column, value]) => {
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        return [
          column,
          text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH)}...` : value,
        ];
      })
  );
}

/** Runs an evidence query and reports what it found, never throwing. */
export async function runEvidence({
  esClient,
  query,
  signal,
}: {
  esClient: ElasticsearchClient;
  query: string;
  signal?: AbortSignal;
}): Promise<{ result: EvidenceResult; rows: EsqlRow[]; error?: string }> {
  if (!query) {
    return { result: 'error', rows: [], error: 'No evidence query' };
  }
  try {
    const { rows } = await queryRows({ esClient, query, signal, timeoutMs: EVIDENCE_TIMEOUT_MS });
    return { result: rows.length > 0 ? 'found' : 'empty', rows };
  } catch (error) {
    return { result: 'error', rows: [], error: getErrorMessage(error).slice(0, 300) };
  }
}

/**
 * Prepares the bounded case for one signal: its evidence, evidence of the event it may join,
 * customer alerts on related services, and memory notes.
 */
export async function buildCase({
  dataEsClient,
  signal,
  kind,
  caseSignal,
  evidenceQuery,
  event,
  proposal,
  firingAlerts,
  relatedServices,
  memory,
  investigationPages,
  sourceTitle,
  signalEvidence,
}: {
  /** The signal's evidence when code already ran it, so it is not queried twice. */
  signalEvidence?: { result: EvidenceResult; rows: EsqlRow[]; error?: string };
  dataEsClient: ElasticsearchClient;
  signal: AbortSignal;
  kind: AgentCase['kind'];
  caseSignal: CaseSignal;
  evidenceQuery: string;
  event?: EngineEvent;
  proposal?: JoinProposal;
  firingAlerts: Array<{ title: string; service: string }>;
  relatedServices: string[];
  memory: string[];
  investigationPages: AgentCase['investigation_context'];
  /** The title of a source, by id; the agent reads titles, not ids. */
  sourceTitle: (sourceId: string | undefined) => string | undefined;
}): Promise<AgentCase> {
  const sources = [
    {
      fingerprint: caseSignal.fingerprint,
      title: caseSignal.title,
      unit: caseSignal.unit,
      query: evidenceQuery,
    },
    ...(event?.members ?? [])
      .filter((member) => member.fingerprint !== caseSignal.fingerprint)
      .slice(0, MAX_EVENT_EVIDENCE)
      .map((member) => ({
        fingerprint: member.fingerprint,
        title: member.title,
        unit: member.unit,
        query: member.evidence_esql,
      })),
  ];

  const evidence = await Promise.all(
    sources.map(async (source, index): Promise<CaseEvidence> => {
      const { result, rows, error } =
        index === 0 && signalEvidence
          ? signalEvidence
          : await runEvidence({ esClient: dataEsClient, query: source.query, signal });
      return {
        id: `E${index + 1}`,
        ...(kind === 'reopen' && index > 0 ? { earlier_episode: true } : {}),
        ...source,
        result,
        rows: rows.slice(0, ROWS_PER_EVIDENCE).map(trimRow),
        error,
      };
    })
  );

  // Only the alerts on the case's own entities: the signal's, its related ones and the event's.
  const watchedServices = new Set([
    caseSignal.service,
    ...relatedServices,
    ...(event?.services ?? []),
  ]);

  return {
    kind,
    signal: caseSignal,
    event: event
      ? {
          event_id: event.event_id,
          title: event.title,
          summary: event.summary,
          severity: event.severity,
          status: event.status,
          services: event.services,
          members: event.members.map((member) => ({
            title: member.title,
            service: member.service,
            source: sourceTitle(member.source_id),
            strategy: member.strategy,
            importance: member.importance,
            unit: member.unit,
          })),
        }
      : undefined,
    join_proposal: proposal
      ? {
          event_id: proposal.event.event_id,
          reason: proposal.reason,
          relation: proposal.relation,
          via: proposal.via,
          minutes_apart: Math.round(proposal.minutesApart),
          dependency_kind: proposal.dependencyKind,
        }
      : undefined,
    evidence,
    firing_customer_alerts: firingAlerts.filter((alert) => watchedServices.has(alert.service)),
    related_services: relatedServices,
    memory,
    investigation_context: investigationPages,
  };
}
