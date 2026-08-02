/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { watchLabel } from '../../../../pages/conversations/helpers/watch_label';
import type { PndParticipantTone } from '../participant_badge_color';

export interface PndFlyoutParticipant {
  /** The watch's display name, or its raw workflow id when it is not one of the five managed watches. */
  label: string;
  /** `undefined` for a custom watch, which has no registered tone. */
  tone?: PndParticipantTone;
  workflowId: string;
}

/**
 * The badge tone of each managed watch.
 *
 * Three come straight from the prototype's fixtures (`src/events/blackHatTriage.ts` at `10e153f`):
 * Deep Watch is `accent`, Watch Floor is `success`, Watch Officer is `primary`. The prototype never
 * shows the other two, so Detection Watch takes `warning` — the one tone its four-tone union leaves
 * unused — and Dark Watch shares `accent` with Deep Watch, the other long-horizon analysis watch,
 * rather than colliding with a watch it has nothing in common with.
 */
const TONE_BY_WORKFLOW_ID: Readonly<Record<string, PndParticipantTone>> = {
  [SYSTEM_SECURITY_WATCH_DARK_ID]: 'accent',
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: 'accent',
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: 'warning',
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: 'success',
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: 'primary',
};

/**
 * The watches that produced this discovery, one badge apiece, in first-seen order.
 *
 * Derived from the projection the flyout already holds rather than from a second read: a step that
 * ran names the workflow that ran it, so the set of distinct `workflowId`s *is* the set of watches
 * that participated, and nothing else on the wire says it more directly.
 *
 * A row with no `workflowId` contributes nothing rather than an empty badge: the two `upstream`
 * catalog rows are resolved from the catalog and no workflow realizes them, so there is no watch to
 * credit. (Until kibana-phf4.12 those rows were backed by a lifecycle-stub workflow that had to be
 * filtered out here by id, because listing it would have put a workflow that watched nothing in front
 * of the analyst on every discovery.)
 *
 * First-seen order rather than sorted, so the watch that opened the discovery leads the row and the
 * order never reshuffles between renders of the same projection.
 */
export const buildFlyoutParticipants = (
  steps: readonly PndPhaseStepProjection[]
): readonly PndFlyoutParticipant[] =>
  steps
    .flatMap(({ workflowId }) => (workflowId != null && workflowId !== '' ? [workflowId] : []))
    .filter((workflowId, index, all) => all.indexOf(workflowId) === index)
    .map((workflowId) => ({
      label: watchLabel(workflowId),
      tone: TONE_BY_WORKFLOW_ID[workflowId],
      workflowId,
    }));
