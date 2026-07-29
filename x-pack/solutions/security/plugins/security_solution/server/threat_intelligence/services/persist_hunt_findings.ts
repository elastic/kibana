/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { THREAT_INTEL_HUNT_FINDINGS_INDEX } from '../../../common/threat_intelligence/hub';
import { buildFingerprint } from '../adapters/fingerprint';
import type { ValidatedBehavior } from './hunt_behavior';

/**
 * Daily UTC bucket for finding `_id` stability. Re-runs on the same calendar
 * day for the same report + technique collide (idempotent create); a new day
 * can emit a fresh finding row.
 */
export const huntFindingTimeBucket = (now: Date = new Date()): string =>
  now.toISOString().slice(0, 10);

export const buildHuntFindingId = ({
  reportId,
  techniqueId,
  timeBucket,
}: {
  reportId: string;
  techniqueId: string;
  timeBucket: string;
}): string => buildFingerprint([reportId, techniqueId, timeBucket]);

/** Minimal hunt snapshot needed to persist Tier 2 finding rows. */
export interface PersistableHuntSnapshot {
  status: string;
  report_id?: string;
  tier1: {
    status: string;
    affected_assets?: {
      hosts?: Array<{ name: string }>;
      users?: Array<{ name: string }>;
    };
  };
  tier2?: {
    behaviors?: ValidatedBehavior[];
  };
}

export interface PersistHuntFindingsParams {
  spaceId: string;
  result: PersistableHuntSnapshot;
  reportTitle?: string;
  hypothesisRationale?: string;
  now?: Date;
}

export interface PersistHuntFindingsResult {
  attempted: number;
  created: number;
  skipped: number;
  errors: number;
}

interface HuntFindingDoc {
  '@timestamp': string;
  space_id: string;
  report_id: string;
  report_title?: string;
  technique_id: string;
  technique_name?: string;
  hypothesis: string;
  hypothesis_rationale?: string;
  confidence: number;
  severity: string;
  risk_score: number;
  proposed_esql_rule: string;
  rule_name?: string;
  affected_assets: {
    hosts: string[];
    users: string[];
  };
  tier1_status: string;
  hunt_run_status: string;
  hunt_run_id: string;
}

const toFindingDoc = ({
  spaceId,
  reportId,
  reportTitle,
  behavior,
  result,
  hypothesisRationale,
  now,
}: {
  spaceId: string;
  reportId: string;
  reportTitle?: string;
  behavior: ValidatedBehavior;
  result: PersistableHuntSnapshot;
  hypothesisRationale?: string;
  now: Date;
}): HuntFindingDoc => {
  const hosts = result.tier1.affected_assets?.hosts?.map((h) => h.name) ?? [];
  const users = result.tier1.affected_assets?.users?.map((u) => u.name) ?? [];

  return {
    '@timestamp': now.toISOString(),
    space_id: spaceId,
    report_id: reportId,
    ...(reportTitle ? { report_title: reportTitle } : {}),
    technique_id: behavior.technique_id,
    technique_name: behavior.technique_name,
    hypothesis: behavior.evidence_quote,
    ...(hypothesisRationale ? { hypothesis_rationale: hypothesisRationale } : {}),
    confidence: behavior.confidence,
    severity: behavior.severity,
    risk_score: behavior.risk_score,
    proposed_esql_rule: behavior.proposed_esql_rule,
    rule_name: behavior.rule_name,
    affected_assets: { hosts, users },
    tier1_status: result.tier1.status,
    hunt_run_status: result.status,
    // Stable per orchestrator invocation for correlating sibling findings.
    hunt_run_id: buildFingerprint([
      reportId,
      result.status,
      result.tier1.status,
      String(result.tier2?.behaviors?.length ?? 0),
      now.toISOString(),
    ]),
  };
};

/**
 * Persist Tier 2 behaviors from a hunt_orchestrator result as durable
 * finding rows. Uses deterministic `_id` + `op_type: create` so scheduled
 * re-runs on the same day do not duplicate findings.
 */
export const persistHuntFindings = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  params: PersistHuntFindingsParams
): Promise<PersistHuntFindingsResult> => {
  const { spaceId, result, reportTitle, hypothesisRationale } = params;
  const now = params.now ?? new Date();
  const reportId = result.report_id;
  const behaviors = result.tier2?.behaviors ?? [];

  if (!reportId || behaviors.length === 0) {
    return { attempted: 0, created: 0, skipped: 0, errors: 0 };
  }

  const timeBucket = huntFindingTimeBucket(now);
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const behavior of behaviors) {
    const id = buildHuntFindingId({
      reportId,
      techniqueId: behavior.technique_id,
      timeBucket,
    });
    const doc = toFindingDoc({
      spaceId,
      reportId,
      reportTitle,
      behavior,
      result,
      hypothesisRationale,
      now,
    });

    try {
      await esClient.create({
        index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
        id,
        document: doc,
      });
      created += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number; meta?: { statusCode?: number } })
        .statusCode;
      const metaStatus = (err as { meta?: { statusCode?: number } }).meta?.statusCode;
      if (statusCode === 409 || metaStatus === 409) {
        skipped += 1;
      } else {
        errors += 1;
        logger.warn(
          `persistHuntFindings failed for report=${reportId} technique=${behavior.technique_id}: ${
            (err as Error).message
          }`
        );
      }
    }
  }

  return { attempted: behaviors.length, created, skipped, errors };
};

/**
 * Fire-and-forget wrapper — never fails the hunt response because of
 * persistence issues.
 */
export const persistHuntFindingsSafe = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  params: PersistHuntFindingsParams
): Promise<PersistHuntFindingsResult> => {
  try {
    return await persistHuntFindings(esClient, logger, params);
  } catch (err) {
    logger.warn(`persistHuntFindingsSafe: ${(err as Error).message}`);
    return { attempted: 0, created: 0, skipped: 0, errors: 1 };
  }
};
