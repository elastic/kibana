/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { isServerlessDeployment } from './worker_setup';

/**
 * On stateful, every `/internal/alertzero/*` route answers 404 unless the
 * active space has the Security solution view (alertzero `isSpaceSupported`).
 * A space with no solution is Classic, which is what a fresh stack's default
 * space is. The suite's kbnClient calls carry no `/s/<id>` prefix, so they all
 * run in the default space; that is the space this switches. Serverless has no
 * solution views and skips the check, so nothing is changed there.
 *
 * Side effect: switching a space's solution clears `solutionSetupRequired`, so a
 * dev stack started with `xpack.spaces.initialSolutionSetup.enabled` loses its
 * first-run solution picker. Scout and eval stacks turn that setting off.
 */
const SPACE_ID = 'default';
const SPACES_PUBLIC_API_VERSION = '2023-10-31';

export type SolutionView = 'security' | 'oblt' | 'es' | 'classic';

/** What `ensureSecuritySolutionView` changed; `restoreSolutionView` puts it back. */
export interface SolutionViewPriorState {
  /** Set only when setup switched the view, so restore is a no-op otherwise. */
  previous?: SolutionView;
}

const readSolution = async (kbnClient: KbnClient): Promise<SolutionView> => {
  const space = await kbnClient.request<{ solution?: SolutionView }>({
    path: `/api/spaces/space/${SPACE_ID}`,
    method: 'GET',
    headers: { 'elastic-api-version': SPACES_PUBLIC_API_VERSION },
  });
  return space.data.solution ?? 'classic';
};

const setSolution = async (kbnClient: KbnClient, solution: SolutionView): Promise<void> => {
  await kbnClient.request({
    path: `/internal/spaces/space/${SPACE_ID}/solution`,
    method: 'PUT',
    headers: { 'x-elastic-internal-origin': 'Kibana', 'kbn-xsrf': 'true' },
    body: { solution },
  });
};

export const ensureSecuritySolutionView = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<SolutionViewPriorState> => {
  if (await isServerlessDeployment(kbnClient)) return {};
  const previous = await readSolution(kbnClient);
  if (previous === 'security') return {};

  await setSolution(kbnClient, 'security');
  const after = await readSolution(kbnClient);
  if (after !== 'security') {
    await setSolution(kbnClient, previous).catch(() => {});
    throw new Error(
      `[hunt-watch] space ${SPACE_ID} still has solution view '${after}' after setting 'security'; AlertZero routes would answer 404`
    );
  }
  log.info(`[hunt-watch] space ${SPACE_ID}: solution view '${previous}' -> 'security'`);
  return { previous };
};

/** Logs instead of throwing, so teardown cannot mask the sweep's own error. */
export const restoreSolutionView = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  prior: SolutionViewPriorState
): Promise<void> => {
  if (!prior.previous) return;
  try {
    await setSolution(kbnClient, prior.previous);
  } catch (e) {
    log.warning(
      `[hunt-watch] could not restore space ${SPACE_ID} solution view '${prior.previous}': ${String(
        e
      )}`
    );
  }
};
