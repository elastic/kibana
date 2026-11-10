/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds the state of the Nightshift onboarding exploration without running the agent. Run from
 * the repo root:
 *
 *   node -r @kbn/setup-node-env x-pack/solutions/observability/plugins/nightshift/scripts/seed_nightshift_onboarding.ts --state succeeded
 *
 * Add --help to list the states and connection flags.
 */

import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import type { OnboardingSuggestion } from '@kbn/nightshift-investigations-plugin/common';

const EXECUTIONS_INDEX = '.workflows-executions';
const WORKFLOW_ID = 'system-nightshift-onboarding-suggestions';
const EXECUTION_ID_PREFIX = 'nightshift-seed-onboarding-';
const STATES = ['running', 'succeeded', 'empty', 'failed', 'none'] as const;
type SeedState = (typeof STATES)[number];

const SUGGESTIONS: OnboardingSuggestion[] = [
  {
    title: 'checkout: 5xx errors up 4x in the last hour',
    prompt:
      'checkout-service returned 1,842 HTTP 5xx responses in the last hour, against about 450 per hour over the previous 23 hours. Most are "upstream connect error" from payment-service. What started the spike, and is payment-service the cause?',
    rationale: 'checkout is business critical (your hint); 5xx up 4x in the last hour.',
    source: 'error_spike',
  },
  {
    title: 'Failed transaction rate alert on payment-service',
    prompt:
      'The "Failed transaction rate" rule fired twice on payment-service in the last 24 hours (38% for 25 minutes, then 21% for 18 minutes). Both recovered. What caused the failures, and could they come back?',
    rationale: 'Two alert firings in 24h on payment-service, both recovered without an action.',
    source: 'alert',
  },
  {
    title: 'frontend: p99 latency on POST /cart up from 0.8s to 4.2s',
    prompt:
      'frontend p99 latency for POST /cart rose from about 0.8s to 4.2s over the last 6 hours, while traffic stayed flat. Which downstream span is responsible, and when did it start?',
    rationale: 'p99 5x higher at flat traffic; 12,400 affected requests in traces-*.',
    source: 'latency',
  },
  {
    title: 'Release v2.14.0 of checkout merged 2 hours before the spike',
    prompt:
      'Release v2.14.0 of elastic/checkout was published 2 hours before the checkout 5xx spike. It changes the payment client retry settings. Did this release cause the errors?',
    rationale: 'Release published on GitHub 2h before the error spike; touches the payment client.',
    source: 'code_change',
  },
  {
    title: 'inventory-indexer: steady "request body too large" export failures',
    prompt:
      'inventory-indexer logged 1,282 errors in the last 24 hours, all "Failed to export metrics batch: request body too large", at about 55 per hour. Is telemetry being dropped, and what batch size would fix it?',
    rationale: '1,282 identical errors over 24h; metrics batches exceed the receiver limit.',
    source: 'other',
  },
];

const basicAuth = (credentials: string): string =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

const request = async <T>(
  url: string,
  { method = 'GET', auth, body }: { method?: string; auth: string; body?: unknown }
): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: { Authorization: basicAuth(auth), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
};

const isSeedState = (value: string): value is SeedState =>
  (STATES as readonly string[]).includes(value);

const executionDoc = ({
  id,
  spaceId,
  state,
  startedAt,
}: {
  id: string;
  spaceId: string;
  state: Exclude<SeedState, 'none'>;
  startedAt: number;
}) => {
  const isRunning = state === 'running';
  const duration = 150_000;
  return {
    id,
    spaceId,
    workflowId: WORKFLOW_ID,
    isTestRun: false,
    status: isRunning ? 'running' : state === 'failed' ? 'failed' : 'completed',
    createdAt: new Date(startedAt).toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    ...(isRunning ? {} : { finishedAt: new Date(startedAt + duration).toISOString(), duration }),
    triggeredBy: 'nightshift-onboarding',
    concurrencyGroupKey: `nightshift-onboarding-suggestions-${spaceId}`,
    workflowDefinition: { name: 'Nightshift Onboarding Suggestions', tags: ['nightshift'] },
    ...(state === 'failed'
      ? {
          error: { type: 'Error', message: 'Seeded failure: the agent did not return suggestions' },
        }
      : {}),
    context: {
      spaceId,
      inputs: {},
      triggeredBy: 'nightshift-onboarding',
      ...(state === 'succeeded' ? { output: { suggestions: SUGGESTIONS } } : {}),
      ...(state === 'empty' ? { output: { suggestions: [] } } : {}),
    },
  };
};

run(
  async ({ log, flags }) => {
    const esUrl = String(flags['es-url']).replace(/\/$/, '');
    const auth = String(flags.auth);
    const spaceId = String(flags.space);
    const state = String(flags.state);
    const elapsedSeconds = Number(flags['elapsed-seconds']);
    if (!isSeedState(state)) {
      throw createFailError(`--state must be one of ${STATES.join(', ')}`);
    }
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw createFailError('--elapsed-seconds must be a non-negative number');
    }

    // "none" also removes real runs, so the space goes back to step 1.
    const { deleted } = await request<{ deleted: number }>(
      `${esUrl}/${EXECUTIONS_INDEX}/_delete_by_query?refresh=true`,
      {
        method: 'POST',
        auth,
        body: {
          query: {
            bool: {
              filter: [
                { term: { workflowId: WORKFLOW_ID } },
                { term: { spaceId } },
                ...(state === 'none' ? [] : [{ prefix: { id: EXECUTION_ID_PREFIX } }]),
              ],
            },
          },
        },
      }
    );
    log.info(`Deleted ${deleted} onboarding run(s) in space "${spaceId}"`);
    if (state === 'none') {
      log.success(`Space "${spaceId}" has no onboarding run: onboarding opens on step 1`);
      return;
    }

    const id = `${EXECUTION_ID_PREFIX}${Date.now()}`;
    await request(`${esUrl}/${EXECUTIONS_INDEX}/_doc/${id}?refresh=true`, {
      method: 'PUT',
      auth,
      body: executionDoc({ id, spaceId, state, startedAt: Date.now() - elapsedSeconds * 1000 }),
    });
    log.success(
      {
        running: 'Step 2 shows "Analyzing your data" until you seed another state',
        succeeded: `Step 2 shows ${SUGGESTIONS.length} suggestions`,
        empty: 'Step 2 shows the generic fallback suggestions',
        failed: 'Step 2 shows the failure callout and the fallback suggestions',
      }[state]
    );
    log.info(
      'Step 3 follows once the space has an investigation; seed one with seed_nightshift_investigations.ts or start one in the UI'
    );
  },
  {
    description: `Writes a run of the ${WORKFLOW_ID} workflow straight into ${EXECUTIONS_INDEX}, so the
      Nightshift onboarding shows a given exploration state without running the agent. The seeded run
      becomes the latest run of the space. Re-running replaces the previously seeded run.`,
    flags: {
      string: ['state', 'space', 'elapsed-seconds', 'es-url', 'auth'],
      default: {
        state: 'succeeded',
        space: 'default',
        'elapsed-seconds': '0',
        'es-url': 'http://localhost:9200',
        auth: 'elastic:changeme',
      },
      help: `
        --state            running | succeeded | empty | failed | none (default: succeeded)
                             running:   the exploration is in progress (step 2, analyzing)
                             succeeded: the exploration returned ${SUGGESTIONS.length} suggestions
                             empty:     it succeeded without suggestions (fallback suggestions)
                             failed:    it failed (failure callout, fallback suggestions)
                             none:      delete all onboarding runs of the space, including real ones (step 1)
        --space            Space id (default: default)
        --elapsed-seconds  How long ago the run started; shown as the elapsed time while running (default: 0)
        --es-url           Elasticsearch URL (default: http://localhost:9200)
        --auth             Superuser credentials (default: elastic:changeme)
      `,
    },
  }
);
