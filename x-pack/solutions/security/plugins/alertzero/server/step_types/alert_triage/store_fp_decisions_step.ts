/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../../common/step_types/package_report';
import {
  triageStoreFpDecisionsStepCommonDefinition,
  type StoreFpDecisionsSkipReason,
} from '../../../common/step_types/alert_triage';
import {
  FP_DECISION_BLOCKING_VERDICT_TAGS,
  FP_DECISION_MIN_ALERTS,
  buildDecisionDocument,
  decisionId,
  groupByStrictKey,
  selectDecisionKeys,
  strictKeyTag,
  type FpDecisionKind,
} from '../../alert_triage/fp_decisions';
import { findKeyTagsWithVerdicts, loadAlertsByIds } from './ports';

export interface StoreFpDecisionsStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
}

const NOTHING = {
  keys_seen: 0,
  alerts_without_strict_key: 0,
  keys_below_minimum: 0,
  keys_with_other_verdicts: 0,
  keys_over_cap: 0,
  written: 0,
  failed: 0,
};

const statusCodeOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { statusCode, meta } = error as { statusCode?: unknown; meta?: { statusCode?: unknown } };
  const code = statusCode ?? meta?.statusCode;
  return typeof code === 'number' ? code : undefined;
};

/**
 * Stores what a decided closure proposal teaches triage about later alerts. It never throws for
 * a reason the proposal could be blamed for: the review has already closed (or re-tagged) the
 * alerts by the time it runs, and a decision store that is off, denied or down must not turn a
 * finished approval into a failed run. The reason is in `skip_reason` instead.
 *
 * The write goes straight to the backing index, as the Hunt coverage writer does: the Context
 * Engine's own `createKi` step cannot apply the consistency rule, and the worker's role already
 * has `index` on this index. It checks the `contextEngine:enabled` setting first.
 */
export const getTriageStoreFpDecisionsStepDefinition = ({
  isContextEngineEnabled,
}: StoreFpDecisionsStepDependencies) =>
  createServerStepDefinition({
    ...triageStoreFpDecisionsStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const result = (
        skipReason: StoreFpDecisionsSkipReason,
        counts: Partial<typeof NOTHING> = {}
      ) => ({
        output: { skip_reason: skipReason, ...NOTHING, ...counts },
      });

      // A supervised approval is automatic: nobody saw the pattern, so nobody approved it.
      if (input.outcome === 'approved' && input.autonomy === 'supervised') {
        return result('supervised');
      }

      try {
        if (!(await isContextEngineEnabled(contextManager.getFakeRequest()))) {
          return result('disabled');
        }

        const kind: FpDecisionKind =
          input.outcome === 'approved' ? 'false_positive' : 'do_not_propose';
        const { alerts } = await loadAlertsByIds(contextManager, input.alert_ids);
        const { groups, alertsWithoutStrictKey } = groupByStrictKey({
          alerts: alerts.map((doc) => ({ id: String(doc._id), doc })),
          spaceId: input.space_id,
        });
        if (groups.length === 0) {
          return result('no_strict_keys', { alerts_without_strict_key: alertsWithoutStrictKey });
        }

        // The consistency rule: only keys with enough alerts can become decisions, so only those
        // are looked up. A failed lookup throws, and then nothing is written.
        const blocked = new Set<string>();
        if (kind === 'false_positive') {
          const tagToHash = new Map(
            groups
              .filter(({ alertIds }) => alertIds.length >= FP_DECISION_MIN_ALERTS)
              .map(({ hash }) => [strictKeyTag(hash), hash])
          );
          const withVerdicts = await findKeyTagsWithVerdicts(
            contextManager,
            [...tagToHash.keys()],
            FP_DECISION_BLOCKING_VERDICT_TAGS
          );
          for (const tag of withVerdicts) {
            const hash = tagToHash.get(tag);
            if (hash !== undefined) blocked.add(hash);
          }
        }

        const selection = selectDecisionKeys({ kind, groups, blocked });
        const counts = {
          keys_seen: selection.keysSeen,
          alerts_without_strict_key: alertsWithoutStrictKey,
          keys_below_minimum: selection.keysBelowMinimum,
          keys_with_other_verdicts: selection.keysWithOtherVerdicts,
          keys_over_cap: selection.keysOverCap,
        };
        if (selection.selected.length === 0) return result('none', counts);

        const now = new Date();
        const index = HUNT_COVERAGE_AI_INDEX_DEST.value;
        const response = await contextManager.getScopedEsClient().bulk({
          refresh: 'wait_for',
          operations: selection.selected.flatMap((group) => [
            // shortcut: this overwrites, so a re-approval would reset a confirmed decision to
            // `approved_via: group`. Nothing confirms decisions yet; use `create` plus an update
            // when confirmation exists.
            { index: { _index: index, _id: decisionId(kind, group.hash) } },
            buildDecisionDocument({
              kind,
              group,
              provenance: {
                spaceId: input.space_id,
                proposalId: input.proposal_id,
                investigationId: input.investigation_id,
                approver: input.approver,
                now,
              },
            }),
          ]),
        });

        const failedItems = response.errors
          ? response.items.filter((item) => item.index?.error !== undefined)
          : [];
        const written = selection.selected.length - failedItems.length;
        // Nothing stored is a failure, not a quiet success: a reader of `skip_reason` must see it.
        if (written === 0) {
          return result(
            failedItems.every((item) => item.index?.status === 403) ? 'denied' : 'storage_failure',
            { ...counts, failed: failedItems.length }
          );
        }
        if (failedItems.length > 0) {
          logger.warn(
            `${failedItems.length} of ${selection.selected.length} triage decisions were not stored`
          );
        }
        return result('none', { ...counts, written, failed: failedItems.length });
      } catch (error) {
        logger.warn(
          `Triage decisions were not stored: ${error instanceof Error ? error.message : error}`
        );
        return result(statusCodeOf(error) === 403 ? 'denied' : 'storage_failure');
      }
    },
  });
