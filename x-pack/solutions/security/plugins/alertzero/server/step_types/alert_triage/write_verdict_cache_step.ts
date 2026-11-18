/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../common/step_types/triage_decisions_index';
import {
  triageWriteVerdictCacheStepCommonDefinition,
  type WriteVerdictCacheSkipReason,
} from '../../../common/step_types/alert_triage';
import { hashKey } from '../../alert_triage/key_tags';
import { buildPatternKeys, getField } from '../../alert_triage/pattern_key';
import {
  buildCacheDocument,
  isReusable,
  nextCacheAction,
  pickKeyRepresentatives,
  recordShadowOutcome,
  verdictCacheId,
  type BatchAlert,
  type CacheTransition,
  type VerdictCacheMode,
} from '../../alert_triage/verdict_cache';
import { loadAlertsByIds, statusCodeOf } from './ports';
import { readCacheRecords } from './verdict_cache_store';

export interface WriteVerdictCacheStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The flag mode. In `off` nothing is read or written. A missing or mistyped value reads as `off`. */
  getMode: () => Promise<VerdictCacheMode>;
}

const NOTHING = {
  keys_seen: 0,
  alerts_without_strict_key: 0,
  created: 0,
  activated: 0,
  made_unstable: 0,
  left_alone: 0,
  conflicts: 0,
  failed: 0,
  records_updated: 0,
  hit_alerts: 0,
  agreements: 0,
  disagreements: 0,
};

const toBatchAlert = (
  doc: Record<string, unknown>,
  verdict: { classification: string; confidence_score: number }
): BatchAlert => ({
  id: String(doc._id),
  riskScore: Number(getField(doc, 'kibana.alert.risk_score') ?? 0) || 0,
  timestamp: Date.parse(String(getField(doc, '@timestamp') ?? '')) || 0,
  doc,
  classification: verdict.classification,
  confidenceScore: verdict.confidence_score,
});

/**
 * Keeps the verdict of the first alert of each strict key in a batch as a verdict cache record, after the batch tagged its
 * alerts. A key with no record gets a `pending` one from a confident false or true positive (run 1). A key with a `pending`
 * record from an earlier batch gets run 2: the same verdict at the floor makes the record `active`, anything else makes the
 * key `unstable` for a day. Nothing reads a record in this step, and in shadow mode nothing acts on one.
 *
 * It fails open. A step that cannot read the setting, the alerts or the records writes nothing and reports the reason, so
 * the batch goes on as before. A record is written with `create`, or with the sequence number it was read with, so a write
 * that lost a race is counted in `conflicts` and left for the next batch.
 */
export const getTriageWriteVerdictCacheStepDefinition = ({
  isContextEngineEnabled,
  getMode,
}: WriteVerdictCacheStepDependencies) =>
  createServerStepDefinition({
    ...triageWriteVerdictCacheStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const result = (
        skipReason: WriteVerdictCacheSkipReason,
        counts: Partial<typeof NOTHING> = {}
      ) => ({ output: { skip_reason: skipReason, ...NOTHING, ...counts } });

      if ((await getMode()) === 'off') return result('off');

      try {
        if (!(await isContextEngineEnabled(contextManager.getFakeRequest()))) {
          return result('disabled');
        }

        const verdictById = new Map(input.verdicts.map((verdict) => [verdict.alert_id, verdict]));
        const { alerts } = await loadAlertsByIds(contextManager, [...verdictById.keys()]);
        const batchAlerts = alerts.flatMap((doc) => {
          const verdict = verdictById.get(String(doc._id));
          return verdict === undefined ? [] : [toBatchAlert(doc, verdict)];
        });
        const alertsWithoutStrictKey = batchAlerts.filter(
          ({ doc }) => buildPatternKeys(doc).strict === undefined
        ).length;
        const representatives = pickKeyRepresentatives({
          alerts: batchAlerts,
          spaceId: input.space_id,
        });
        const counts = {
          keys_seen: representatives.length,
          alerts_without_strict_key: alertsWithoutStrictKey,
        };
        if (representatives.length === 0) return result('none', counts);

        const esClient = contextManager.getScopedEsClient();
        const stored = await readCacheRecords({
          mget: (params) => esClient.mget(params),
          hashes: representatives.map(({ keyHash }) => keyHash),
        });

        const now = new Date();
        const index = TRIAGE_DECISIONS_AI_INDEX_DEST.value;
        const planned: Array<
          { transition: CacheTransition } | { hits: { alerts: number; agreements: number } }
        > = [];
        const operations: Array<Record<string, unknown>> = [];
        let leftAlone = 0;
        for (const { keyHash, strictKey, alert } of representatives) {
          const existing = stored.get(keyHash);
          const action = nextCacheAction({
            existing: existing?.record,
            fresh: {
              alertId: alert.id,
              classification: alert.classification,
              confidenceScore: alert.confidenceScore,
            },
            keyHash,
            strictKey,
            floor: input.confidence_floor,
            now,
          });
          if (action.type === 'none') {
            leftAlone++;
            continue;
          }
          const id = verdictCacheId(keyHash);
          planned.push({ transition: action.transition });
          operations.push(
            existing === undefined
              ? { create: { _index: index, _id: id } }
              : {
                  index: {
                    _index: index,
                    _id: id,
                    if_seq_no: existing.seqNo,
                    if_primary_term: existing.primaryTerm,
                  },
                },
            buildCacheDocument({ record: action.record, spaceId: input.space_id, now })
          );
        }

        // Shadow comparison. Every alert of this batch whose key has a reusable (active) record is a would-be hit: its fresh
        // verdict is compared with the verdict of the record, and the counters of the record are updated, one write for each
        // record. The representative of such a key needs no run, so this does not meet the writes above.
        const alertsByKey = new Map<string, BatchAlert[]>();
        for (const alert of batchAlerts) {
          const { strict } = buildPatternKeys(alert.doc);
          if (strict === undefined) continue;
          const keyHash = hashKey(input.space_id, strict);
          alertsByKey.set(keyHash, [...(alertsByKey.get(keyHash) ?? []), alert]);
        }
        for (const [keyHash, group] of alertsByKey) {
          const existing = stored.get(keyHash);
          const record = existing?.record;
          if (existing === undefined || record === undefined || !isReusable(record, now)) continue;
          const updated = group.reduce(
            (current, alert) =>
              recordShadowOutcome({
                record: current,
                fresh: {
                  alertId: alert.id,
                  classification: alert.classification,
                  confidenceScore: alert.confidenceScore,
                },
              }),
            record
          );
          planned.push({
            hits: {
              alerts: group.length,
              agreements: updated.hits.agreements - record.hits.agreements,
            },
          });
          operations.push(
            {
              index: {
                _index: index,
                _id: verdictCacheId(keyHash),
                if_seq_no: existing.seqNo,
                if_primary_term: existing.primaryTerm,
              },
            },
            buildCacheDocument({ record: updated, spaceId: input.space_id, now })
          );
        }
        if (planned.length === 0) return result('none', { ...counts, left_alone: leftAlone });

        const response = await esClient.bulk({ refresh: false, operations });
        const done = {
          created: 0,
          activated: 0,
          made_unstable: 0,
          records_updated: 0,
          hit_alerts: 0,
          agreements: 0,
          disagreements: 0,
        };
        const failures: number[] = [];
        let conflicts = 0;
        response.items.forEach((item, position) => {
          const outcome = item.create ?? item.index;
          if (outcome?.error === undefined) {
            const entry = planned[position];
            if ('transition' in entry) {
              done[entry.transition]++;
            } else {
              done.records_updated++;
              done.hit_alerts += entry.hits.alerts;
              done.agreements += entry.hits.agreements;
              done.disagreements += entry.hits.alerts - entry.hits.agreements;
            }
          } else if (outcome.status === 409) {
            conflicts++;
          } else {
            failures.push(outcome.status);
          }
        });
        const base = { ...counts, left_alone: leftAlone, conflicts, failed: failures.length };
        if (failures.length > 0) {
          logger.warn(
            `${failures.length} of ${planned.length} verdict cache records were not written`
          );
        }
        const writtenAny =
          done.created + done.activated + done.made_unstable + done.records_updated > 0;
        if (!writtenAny && failures.length > 0) {
          return result(
            failures.every((status) => status === 403) ? 'denied' : 'storage_failure',
            base
          );
        }
        return result('none', { ...base, ...done });
      } catch (error) {
        logger.warn(
          `The verdict cache was not written: ${error instanceof Error ? error.message : error}`
        );
        return result(statusCodeOf(error) === 403 ? 'denied' : 'storage_failure');
      }
    },
  });
