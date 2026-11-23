/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX } from '../../../alert_triage/constants';
import { tagInChunks } from '../../../alert_triage/plan_sweep';
import {
  findAlertsNotClosedAsFalsePositive,
  findOpenAlertIds,
  reopenFalsePositiveClosedAlerts,
  type tagAlerts,
} from '../ports';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

/** What the sweep writes tags with: `tagAlerts` bound to the run's Kibana client. */
type TagWriter = ReturnType<typeof tagAlerts>;

interface ReleaseParams {
  api: KibanaApi;
  write: TagWriter;
  /** The decision whose tag comes off. */
  id: string;
  alertIds: string[];
}

const closedTag = (id: string) => `${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`;

/**
 * Takes the decision's tag off the alerts a failed close left open. Candidates leave out every
 * alert with that tag, so a tag left on an open alert would stop the next sweep from trying again.
 * Alerts the close did reach keep it, so revoke can find them. Throws when a read or write fails.
 */
export const untagStillOpen = async ({ api, write, id, alertIds }: ReleaseParams) => {
  if (alertIds.length === 0) return;
  const open = await findOpenAlertIds(api, alertIds);
  if (open.length === 0) return;
  await tagInChunks(write, { alertIds: open, add: [], remove: [closedTag(id)] });
};

/**
 * Takes the decision's tag off the alerts the close left alone, because an analyst moved them on
 * after the search (acknowledged, or closed for another reason), and returns them. A failure
 * throws, because the notes must not claim a close that did not happen.
 */
export const releaseMovedOn = async ({
  api,
  write,
  id,
  alertIds,
}: ReleaseParams): Promise<string[]> => {
  const left = await findAlertsNotClosedAsFalsePositive(api, alertIds);
  if (left.length > 0) {
    await tagInChunks(write, { alertIds: left, add: [], remove: [closedTag(id)] });
  }
  return left;
};

/**
 * Puts back the alerts of a decision that was revoked while the sweep closed them: the alerts in
 * `closedIds` that are still closed as a false positive are reopened, and every alert in `tagged`
 * loses the decision's tag. Returns how many alerts were reopened. When it throws, the tag may
 * stay on alerts, so running the revoke again finds them.
 */
export const undoClosedAlerts = async ({
  api,
  write,
  id,
  tagged,
  closedIds,
}: Omit<ReleaseParams, 'alertIds'> & {
  tagged: string[];
  closedIds: string[];
}): Promise<number> => {
  const reopened = await reopenFalsePositiveClosedAlerts(api, closedIds);
  await tagInChunks(write, { alertIds: tagged, add: [], remove: [closedTag(id)] });
  return reopened;
};
