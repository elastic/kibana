/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EngineEvent, EvidenceResult } from '../../../../common/detection_engine/types';
import { queryRows, type EsqlRow } from '../esql_helpers';
import type { JoinProposal } from '../join_proposals';
import type { AgentCase, CaseDetection, CaseEvidence } from './types';

/** Rows per evidence item the agent sees; enough to judge, small enough to bound tokens. */
const ROWS_PER_EVIDENCE = 5;
const MAX_EVENT_EVIDENCE = 2;

/** Runs an evidence query and reports what it found, never throwing. */
export async function runEvidence(
  esClient: ElasticsearchClient,
  query: string
): Promise<{ result: EvidenceResult; rows: EsqlRow[]; error?: string }> {
  try {
    const { rows } = await queryRows(esClient, query);
    return { result: rows.length > 0 ? 'found' : 'empty', rows };
  } catch (error) {
    return { result: 'error', rows: [], error: (error as Error).message.slice(0, 300) };
  }
}

/**
 * Prepares the bounded case for one detection: its evidence, evidence of the event it may join,
 * customer alerts on related services, and memory notes.
 */
export async function buildCase({
  dataEsClient,
  kind,
  detection,
  evidenceQuery,
  event,
  proposal,
  firingAlerts,
  relatedServices,
  memory,
}: {
  dataEsClient: ElasticsearchClient;
  kind: AgentCase['kind'];
  detection: CaseDetection;
  evidenceQuery: string;
  event?: EngineEvent;
  proposal?: JoinProposal;
  firingAlerts: Array<{ title: string; service: string }>;
  relatedServices: string[];
  memory: string[];
}): Promise<AgentCase> {
  const sources = [
    {
      fingerprint: detection.fingerprint,
      title: detection.title,
      unit: detection.unit,
      query: evidenceQuery,
    },
    ...(event?.members ?? [])
      .filter((member) => member.fingerprint !== detection.fingerprint)
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
      const { result, rows, error } = await runEvidence(dataEsClient, source.query);
      return {
        id: `E${index + 1}`,
        ...source,
        result,
        rows: rows.slice(0, ROWS_PER_EVIDENCE),
        error,
      };
    })
  );

  const watchedServices = new Set([detection.service, ...relatedServices]);

  return {
    kind,
    detection,
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
            strategy: member.strategy,
          })),
        }
      : undefined,
    join_proposal: proposal
      ? {
          event_id: proposal.event.event_id,
          reason: proposal.reason,
          relation: proposal.relation,
          minutes_apart: Math.round(proposal.minutesApart),
        }
      : undefined,
    evidence,
    firing_customer_alerts: firingAlerts.filter((alert) => watchedServices.has(alert.service)),
    related_services: relatedServices,
    memory,
  };
}
