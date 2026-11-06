/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { ApiClientFixture, ApiServicesFixture, KbnClient, KibanaRole } from '@kbn/scout-oblt';
import {
  NIGHTSHIFT_ENABLED_FLAG,
  NIGHTSHIFT_FEATURE_ID,
  NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG,
} from '@kbn/nightshift-shared';
import {
  apiTest,
  cancelRunsOf,
  cancelScoringRuns,
  getStepOutput,
  listInvestigationRuns,
  listScoringRuns,
  startAnsweringLlm,
  startInvestigation,
  uniqueId,
  waitForFinishedRuns,
} from '../fixtures';
import type { WorkflowRun } from '../fixtures';

/**
 * A Nightshift operator: Agent Builder `all` is what the start route requires, and starts run the
 * investigation workflow, which needs workflow execute access.
 */
const NIGHTSHIFT_OPERATOR_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        [NIGHTSHIFT_FEATURE_ID]: ['all'],
        agentBuilder: ['all'],
        workflowsManagement: ['all'],
        actions: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const CLASSIFY_STEP = 'classify_for_online_evals';
const SCORE_STEP = 'score_reference_free';
const REFERENCE_FREE_JUDGE_COUNT = 3;
/** An investigation run, then its scoring run. */
const ONE_RUN_TIMEOUT_MS = 240_000;
/** Two investigation runs, the first with its scoring run. */
const TWO_RUNS_TIMEOUT_MS = 300_000;

const setFlags = (apiServices: ApiServicesFixture, flags: Record<string, boolean | null>) =>
  apiServices.core.settings({ 'feature_flags.overrides': flags });

/**
 * Online evals on completed investigations. The agent and the judges run against an LLM endpoint
 * that answers every call with the same text, so investigations complete without a real model.
 * The judges can't grade that text, so the assertions are on which runs start and what their
 * steps report, never on the scores.
 */
apiTest.describe('Nightshift online evals', { tag: tags.stateful.classic }, () => {
  let cookieHeader: Record<string, string>;
  let llm: Awaited<ReturnType<typeof startAnsweringLlm>> | undefined;
  const investigationIds: string[] = [];

  /** Starts a manual investigation, or continues the open one that holds `subjectId`. */
  const start = async (apiClient: ApiClientFixture, subjectId: string): Promise<string> => {
    const response = await startInvestigation(apiClient, cookieHeader, {
      subject: { type: 'manual', id: subjectId },
      message: `Why did checkout latency rise? ${uniqueId('scout')}`,
    });
    expect(response).toHaveStatusCode(200);
    const { investigation_id: id } = response.body as { investigation_id: string };
    investigationIds.push(id);
    return id;
  };

  /**
   * Waits for `count` finished investigation runs and returns the latest. The scoring run is
   * started from inside the investigation run, so once it has finished, any scoring run it
   * started is listed.
   */
  const waitForInvestigationRun = async (
    kbnClient: KbnClient,
    id: string,
    count = 1
  ): Promise<WorkflowRun> => {
    const runs = await waitForFinishedRuns(
      `investigation runs of ${id}`,
      () => listInvestigationRuns(kbnClient, id),
      count
    );
    return runs[0];
  };

  apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
    // The config set pauses scoring so other suites' investigations start no scoring runs.
    await setFlags(apiServices, {
      [NIGHTSHIFT_ENABLED_FLAG]: true,
      [NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG]: false,
    });
    ({ cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_OPERATOR_ROLE));
    llm = await startAnsweringLlm();
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    for (const id of investigationIds.splice(0)) {
      await cancelRunsOf(kbnClient, id);
    }
    await cancelScoringRuns(kbnClient);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    llm?.close();
    await setFlags(apiServices, {
      [NIGHTSHIFT_ENABLED_FLAG]: null,
      [NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG]: null,
    });
  });

  apiTest(
    "scores a new investigation's first round once, with the reference-free judges",
    async ({ apiClient, kbnClient }) => {
      apiTest.setTimeout(ONE_RUN_TIMEOUT_MS);
      const id = await start(apiClient, uniqueId('scout-online-evals'));

      const run = await waitForInvestigationRun(kbnClient, id);
      expect(run.status).toBe('completed');
      expect(await getStepOutput(kbnClient, run.id, CLASSIFY_STEP)).toMatchObject({
        should_score: true,
        round_kind: 'initial',
      });

      const scoringRuns = await waitForFinishedRuns(`scoring runs of ${id}`, () =>
        listScoringRuns(kbnClient, id)
      );
      expect(scoringRuns).toHaveLength(1);
      expect(scoringRuns[0].status).toBe('completed');
      expect(await getStepOutput(kbnClient, scoringRuns[0].id, SCORE_STEP)).toMatchObject({
        scored: true,
        evaluator_count: REFERENCE_FREE_JUDGE_COUNT,
      });
    }
  );

  apiTest(
    'starts no scoring run for a follow-up, such as a question',
    async ({ apiClient, kbnClient }) => {
      apiTest.setTimeout(TWO_RUNS_TIMEOUT_MS);
      const subjectId = uniqueId('scout-online-evals');
      const id = await start(apiClient, subjectId);
      await waitForInvestigationRun(kbnClient, id);

      // Starting again for the same subject continues the open investigation with a follow-up.
      expect(await start(apiClient, subjectId)).toBe(id);
      const followUp = await waitForInvestigationRun(kbnClient, id, 2);
      expect(followUp.status).toBe('completed');
      expect(await getStepOutput(kbnClient, followUp.id, CLASSIFY_STEP)).toMatchObject({
        should_score: false,
        round_kind: 'follow_up',
        skip_reason: 'follow_up_not_scored',
      });
      // Only the first round's scoring run.
      expect(await listScoringRuns(kbnClient, id)).toHaveLength(1);
    }
  );

  apiTest(
    'leaves the investigation completed when every judge fails',
    async ({ apiClient, kbnClient }) => {
      apiTest.setTimeout(ONE_RUN_TIMEOUT_MS);
      llm?.close();
      llm = await startAnsweringLlm({ failJudges: true });
      try {
        const id = await start(apiClient, uniqueId('scout-online-evals'));

        expect((await waitForInvestigationRun(kbnClient, id)).status).toBe('completed');
        const [scoringRun] = await waitForFinishedRuns(`scoring runs of ${id}`, () =>
          listScoringRuns(kbnClient, id)
        );
        // Judge failures are reported on the score event; the scoring run itself completes.
        expect(scoringRun.status).toBe('completed');
        expect(await getStepOutput(kbnClient, scoringRun.id, SCORE_STEP)).toMatchObject({
          scored: true,
          evaluator_count: REFERENCE_FREE_JUDGE_COUNT,
          failed_count: REFERENCE_FREE_JUDGE_COUNT,
        });
      } finally {
        llm.close();
        llm = await startAnsweringLlm();
      }
    }
  );

  apiTest(
    'starts no scoring run while the kill switch is on',
    async ({ apiClient, kbnClient, apiServices }) => {
      apiTest.setTimeout(ONE_RUN_TIMEOUT_MS);
      await setFlags(apiServices, { [NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG]: true });
      try {
        const id = await start(apiClient, uniqueId('scout-online-evals'));

        const run = await waitForInvestigationRun(kbnClient, id);
        expect(run.status).toBe('completed');
        expect(await getStepOutput(kbnClient, run.id, CLASSIFY_STEP)).toMatchObject({
          should_score: false,
          skip_reason: 'paused',
        });
        expect(await listScoringRuns(kbnClient, id)).toHaveLength(0);
      } finally {
        await setFlags(apiServices, { [NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG]: false });
      }
    }
  );
});
