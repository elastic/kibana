/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../../common/step_types/package_report';
import { triageRevokeFpDecisionStepCommonDefinition } from '../../../common/step_types/alert_triage';
import {
  MAX_REVOKE_PAGES,
  TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX,
  TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX,
  VERDICT_INCONCLUSIVE_TAG,
} from '../../alert_triage/constants';
import { FP_DECISION_ID_PREFIX } from '../../alert_triage/fp_decisions';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import { findAlertIdsByTag, openAlerts, statusCodeOf, tagAlerts } from './ports';

export interface RevokeFpDecisionStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
}

/**
 * Takes a decision back. The decision is soft-deleted first, as the Context Engine does, so no
 * later sweep matches it, and then its alerts are put back:
 * - an approved decision's alerts are reopened and lose `az:closed_by_decision:<id>`;
 * - a dismissal's alerts lose `az:inconclusive` and `az:skipped_by_decision:<id>`, so the sweep
 *   picks them up again.
 *
 * Only alerts carrying the decision's tag are touched. It is safe to run again: a step that fails
 * is counted in `failures`, and the tag still marks what is left. It does not stop when the
 * Context Engine is off, because the alerts must be put back whatever the state of the setting.
 */
export const getTriageRevokeFpDecisionStepDefinition = ({
  isContextEngineEnabled,
}: RevokeFpDecisionStepDependencies) =>
  createServerStepDefinition({
    ...triageRevokeFpDecisionStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const id = input.decision_id;
      const isApproval = id.startsWith(FP_DECISION_ID_PREFIX);
      let failures = 0;
      let status: 'ok' | 'disabled' | 'not_found' = 'ok';

      if (await isContextEngineEnabled(contextManager.getFakeRequest())) {
        try {
          await contextManager.getScopedEsClient().update({
            index: HUNT_COVERAGE_AI_INDEX_DEST.value,
            id,
            doc: {
              updated_at: new Date().toISOString(),
              governance: { lifecycle: { status: 'deleted' } },
            },
            refresh: true,
          });
        } catch (error) {
          if (statusCodeOf(error) === 404) {
            status = 'not_found';
          } else {
            failures++;
            logger.warn(
              `Could not delete decision ${id}: ${error instanceof Error ? error.message : error}`
            );
          }
        }
      } else {
        status = 'disabled';
      }

      // A decision that could not be deleted would close its alerts again on the next sweep.
      if (failures > 0)
        return { output: { status, alerts_reopened: 0, alerts_released: 0, failures } };

      const tag = `${
        isApproval ? TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX : TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX
      }${id}`;
      const write = tagAlerts(contextManager);
      let reopened = 0;
      let released = 0;
      try {
        for (let page = 0; page < MAX_REVOKE_PAGES; page++) {
          // The tag leaves the alerts on success, so each page is the next batch of what is left.
          const alertIds = await findAlertIdsByTag(contextManager, tag);
          if (alertIds.length === 0) break;
          if (isApproval) {
            await openAlerts(contextManager, alertIds);
            reopened += alertIds.length;
          }
          await tagInChunks(write, {
            alertIds,
            add: [],
            remove: isApproval ? [tag] : [tag, VERDICT_INCONCLUSIVE_TAG],
          });
          if (!isApproval) released += alertIds.length;
        }
      } catch (error) {
        failures++;
        logger.warn(
          `Could not put back the alerts of decision ${id}: ${
            error instanceof Error ? error.message : error
          }`
        );
      }

      return { output: { status, alerts_reopened: reopened, alerts_released: released, failures } };
    },
  });
