/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { KibanaRole } from '@kbn/scout-oblt';
import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import {
  apiTest,
  cancelRunsOf,
  cancelWorkflowRuns,
  createAlertStartWorkflow,
  createLlmConnector,
  deleteConnector,
  deleteWorkflow,
  findInvestigationBySubject,
  findOrCreateSlackThread,
  listSharedInvestigations,
  makeAlertSnapshot,
  runAlertStartWorkflow,
  setInvestigationStatus,
  startInvestigation,
  startUnresponsiveLlm,
  uniqueId,
  waitForInvestigation,
} from '../fixtures';
import type { SharedInvestigation } from '../fixtures';

/**
 * A Nightshift operator: the investigations and proposals API privileges come from the Nightshift
 * feature alone. Agent Builder `all` is what the start route requires, and starts run the
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

/**
 * The investigation write path on Agent Builder conversations: starts land on an investigation
 * whose subjects the shared agentic investigations API reads. The agent runs against an LLM
 * endpoint that never answers, so investigations stay in progress and no real model is needed;
 * the assertions are on the recorded investigation, never on agent output.
 */
apiTest.describe(
  'Nightshift investigations on Agent Builder conversations',
  { tag: tags.stateful.classic },
  () => {
    let cookieHeader: Record<string, string>;
    let llm: Awaited<ReturnType<typeof startUnresponsiveLlm>>;
    let connectorId: string;
    let alertWorkflowId: string;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_OPERATOR_ROLE));
      llm = await startUnresponsiveLlm();
      connectorId = await createLlmConnector(kbnClient, llm.url);
      alertWorkflowId = await createAlertStartWorkflow(kbnClient, uniqueId('scout-alert-start'));
    });

    // Runs stay on the unresponsive LLM and hold task manager capacity the next test needs.
    apiTest.afterEach(async ({ kbnClient }) => {
      await cancelWorkflowRuns(kbnClient, alertWorkflowId);
      await cancelWorkflowRuns(kbnClient);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteWorkflow(kbnClient, alertWorkflowId);
      await deleteConnector(kbnClient, connectorId);
      llm.close();
    });

    apiTest(
      'a manual start returns an investigation the shared API reads with its subject, in progress',
      async ({ apiClient }) => {
        const question = `Why did checkout latency rise? ${uniqueId('scout')}`;
        const response = await startInvestigation(apiClient, cookieHeader, {
          subject: { type: 'manual' },
          message: question,
        });
        expect(response).toHaveStatusCode(200);
        const { investigation_id: id } = response.body as { investigation_id: string };
        expect(typeof id).toBe('string');

        const investigation = await waitForInvestigation(apiClient, cookieHeader, id);
        // Created without a title: Agent Builder generates one when the first round ends, which
        // the unresponsive LLM never lets it reach.
        expect(investigation).toMatchObject({
          id,
          title: 'New conversation',
          title_pending: true,
          agent_id: 'nightshift.investigation',
          metadata: { status: 'open' },
          in_progress: true,
        });
        expect(investigation.subjects).toStrictEqual([
          expect.objectContaining({
            type: 'manual',
            id,
            summary: question,
            trigger_type: 'manual',
          }),
        ]);
      }
    );

    apiTest(
      'a start sharing an alert with an open investigation continues it with the union of subjects',
      async ({ apiClient, kbnClient }) => {
        // Two workflow runs start investigations and two investigation runs follow.
        apiTest.setTimeout(180_000);
        const [first, second, third] = [1, 2, 3].map((n) => uniqueId(`scout-alert-${n}`));

        await runAlertStartWorkflow(kbnClient, alertWorkflowId, [
          makeAlertSnapshot(first),
          makeAlertSnapshot(second),
        ]);
        const id = await findInvestigationBySubject(apiClient, cookieHeader, {
          type: 'alert',
          id: first,
        });
        const created = await waitForInvestigation(apiClient, cookieHeader, id, 2);
        expect(created.subjects.map(({ id: subjectId }) => subjectId).sort()).toStrictEqual(
          [first, second].sort()
        );
        expect(created.subjects[0].snapshot).toMatchObject({ rule_name: 'Scout latency rule' });
        // The step's `title` is accepted but not stored; Agent Builder titles the investigation.
        expect(created).toMatchObject({ title: 'New conversation', title_pending: true });

        await runAlertStartWorkflow(kbnClient, alertWorkflowId, [
          makeAlertSnapshot(second),
          makeAlertSnapshot(third),
        ]);
        // The follow-up run queues behind the first, which waits on the unresponsive LLM.
        await cancelRunsOf(kbnClient, id);
        const continued = await waitForInvestigation(apiClient, cookieHeader, id, 3);
        expect(continued.subjects.map(({ id: subjectId }) => subjectId).sort()).toStrictEqual(
          [first, second, third].sort()
        );
        expect(continued.subjects.every(({ type }) => type === 'alert')).toBe(true);

        // The shared list finds the investigation by any of its alerts.
        const listed = await listSharedInvestigations(
          apiClient,
          cookieHeader,
          `subject_type=alert&subject_id=${encodeURIComponent(third)}`
        );
        expect(listed).toHaveStatusCode(200);
        expect(
          (listed.body as { results: SharedInvestigation[] }).results.map(
            ({ id: listedId }) => listedId
          )
        ).toStrictEqual([id]);
      }
    );

    apiTest('a closed investigation is never continued', async ({ apiClient }) => {
      const subjectId = uniqueId('scout-question');
      const start = () =>
        startInvestigation(apiClient, cookieHeader, {
          subject: { type: 'manual', id: subjectId },
          message: 'Why are payments timing out?',
        });

      const first = await start();
      expect(first).toHaveStatusCode(200);
      const { investigation_id: closedId } = first.body as { investigation_id: string };
      await waitForInvestigation(apiClient, cookieHeader, closedId);
      expect(
        await setInvestigationStatus(apiClient, cookieHeader, closedId, 'closed')
      ).toHaveStatusCode(200);

      const second = await start();
      expect(second).toHaveStatusCode(200);
      const { investigation_id: newId } = second.body as { investigation_id: string };
      expect(newId).not.toBe(closedId);

      const replacement = await waitForInvestigation(apiClient, cookieHeader, newId);
      expect(replacement.metadata.status).toBe('open');
      const listed = await listSharedInvestigations(
        apiClient,
        cookieHeader,
        `subject_type=manual&subject_id=${encodeURIComponent(subjectId)}&status=open`
      );
      expect(
        (listed.body as { results: SharedInvestigation[] }).results.map(({ id }) => id)
      ).toStrictEqual([newId]);
    });

    apiTest(
      'a Slack thread investigation is found by its thread, on the route and in the shared list',
      async ({ apiClient }) => {
        const thread = {
          workspace: 'TSCOUT',
          channel: 'CSCOUT',
          thread_ts: `${Date.now()}.000100`,
        };
        const threadKey = `team:${thread.workspace}/channel:${thread.channel}/thread:${thread.thread_ts}`;

        const created = await findOrCreateSlackThread(apiClient, cookieHeader, {
          ...thread,
          text: '<@U1> why is checkout slow?',
          create: true,
        });
        expect(created).toHaveStatusCode(200);
        const { investigation_id: id, title } = created.body as {
          investigation_id: string;
          title: string;
        };
        // Until Agent Builder titles the investigation, the route headlines the question.
        expect(title).toBe('why is checkout slow?');

        const recorded = await findOrCreateSlackThread(apiClient, cookieHeader, {
          ...thread,
          create: false,
          slack_message_ts: '1712345679.000200',
        });
        expect(recorded.body).toStrictEqual({
          investigation_id: id,
          title,
          slack_message_ts: '1712345679.000200',
        });

        const listed = await listSharedInvestigations(
          apiClient,
          cookieHeader,
          `subject_type=slack_thread&subject_id=${encodeURIComponent(threadKey)}`
        );
        expect(listed).toHaveStatusCode(200);
        const [investigation] = (listed.body as { results: SharedInvestigation[] }).results;
        expect(investigation.id).toBe(id);
        expect(investigation.title_pending).toBe(true);
        expect(investigation.subjects).toStrictEqual([
          expect.objectContaining({
            type: 'slack_thread',
            id: threadKey,
            summary: 'why is checkout slow?',
            slack: {
              channel: thread.channel,
              thread_ts: thread.thread_ts,
              status_message_ts: '1712345679.000200',
            },
          }),
        ]);
      }
    );
  }
);
