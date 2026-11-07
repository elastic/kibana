/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { findAlertsByTag, openAlerts, statusCodeOf, tagAlerts } from './ports';

/**
 * Takes a decision back. The decision is soft-deleted first, as the Context Engine does, so no
 * later sweep matches it, and then its alerts are put back:
 * - an approved decision's alerts that are still closed are reopened, and all of them lose
 *   `az:closed_by_decision:<id>`. An alert an analyst moved on (acknowledged, closed again) keeps its status;
 * - a dismissal's alerts lose `az:inconclusive` and `az:skipped_by_decision:<id>`, so the sweep
 *   picks them up again.
 *
 * Only alerts carrying the decision's tag are touched. It is safe to run again: a step that fails
 * is counted in `failures`, and the tag still marks what is left. A run that reaches the page limit
 * with alerts left counts as a failure too, so run it again until `failures` is 0.
 *
 * The decision must belong to the space of the run: a decision of another space reads as
 * `not_found`, and the step touches neither it nor any alert. The decision is deleted whatever the
 * state of the Context Engine setting, because a decision left active would close the alerts again
 * once the setting is back on.
 */
export const getTriageRevokeFpDecisionStepDefinition = () =>
  createServerStepDefinition({
    ...triageRevokeFpDecisionStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const id = input.decision_id;
      const isApproval = id.startsWith(FP_DECISION_ID_PREFIX);
      let failures = 0;
      let status: 'ok' | 'not_found' = 'ok';

      const es = contextManager.getScopedEsClient();
      try {
        const existing = await es.get<{ attributes?: { space_id?: string } }>({
          index: HUNT_COVERAGE_AI_INDEX_DEST.value,
          id,
          _source: ['attributes.space_id'],
        });
        if (existing._source?.attributes?.space_id !== input.space_id) {
          status = 'not_found';
          return { output: { status, alerts_reopened: 0, alerts_released: 0, failures } };
        }
        await es.update({
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
        let drained = false;
        for (let page = 0; page < MAX_REVOKE_PAGES; page++) {
          // The tag leaves the alerts on success, so each page is the next batch of what is left.
          const tagged = await findAlertsByTag(contextManager, tag);
          const alertIds = tagged.map((alert) => alert.id);
          if (alertIds.length === 0) {
            drained = true;
            break;
          }
          if (isApproval) {
            // The tag stays on an alert an analyst reopened, so only alerts that are still closed
            // are reopened; the rest keep the analyst's later status and only lose the tag.
            const stillClosed = tagged
              .filter((alert) => alert.status === 'closed')
              .map((alert) => alert.id);
            if (stillClosed.length > 0) await openAlerts(contextManager, stillClosed);
            reopened += stillClosed.length;
          }
          await tagInChunks(write, {
            alertIds,
            add: [],
            remove: isApproval ? [tag] : [tag, VERDICT_INCONCLUSIVE_TAG],
          });
          if (!isApproval) released += alertIds.length;
        }
        // The page limit ended the loop, so alerts may still carry the tag. Report it as a failure,
        // so a run that stopped early is never read as a complete revoke.
        if (!drained) {
          failures++;
          logger.warn(
            `Stopped after ${MAX_REVOKE_PAGES} pages of alerts for decision ${id}; run the revoke again to put back the rest`
          );
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
