/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Puts the test stack back to a clean state between runs of the Alert Triage worker, so that every run starts from
 * the same generated alerts and with nothing from the run before. In this order:
 *
 * 1. Cancel every workflow execution that has not finished (waiting reviews and proposals would otherwise stay for 72 hours).
 * 2. Delete the proposals and the investigation impact records (plain indices).
 * 3. Delete the notes that sit on alerts with an `az:` tag, through the notes API (the saved-object index is restricted).
 * 4. Delete the conversations whose title starts with "Alert Triage", through the Agent Builder API (restricted index).
 * 5. Delete every alert of the alert index and write the generated day again (`replay_alerts_cli.js --backfill`).
 *
 * It never writes to a restricted index directly. `--dry-run` only prints what it would change.
 * It writes only when the cluster name of `--es` equals `--expect-cluster`.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/reset_triage_state_cli.js \
 *     --data <folder with alerts.ndjson and rule_map.json> --es http://localhost:9200 --expect-cluster elasticsearch \
 *     [--kibana http://localhost:5601] [--index .alerts-security.alerts-default] [--dry-run]
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

import { execFileSync } from 'child_process';
import path from 'path';

export interface ResetArgs {
  data: string;
  es: string;
  expectCluster: string;
  kibana: string;
  index: string;
  dryRun: boolean;
}

/** What the reset found and changed. The keys are filled in the order of the steps. */
export interface ResetReport {
  dryRun: boolean;
  unfinishedExecutions?: number;
  plainDocuments?: Record<string, number>;
  taggedAlerts?: number;
  notes?: number;
  conversations?: number;
  alertsBefore?: number;
  after?: Record<string, number>;
}

interface ExecutionSearch {
  hits: { total: { value: number }; hits: Array<{ _source: { id: string } }> };
}

interface IdSearch {
  hits: { hits: Array<{ _id: string }> };
}

interface Count {
  count: number;
}

interface ClusterInfo {
  cluster_name: string;
}

interface ConversationList {
  results?: Array<{ id: string; title: string }>;
}

type RequestBody = Readonly<Record<string, string | number | boolean | object>>;
type Headers = Readonly<Record<string, string>>;

type ValueFlagKey = 'data' | 'es' | 'expectCluster' | 'kibana' | 'index';

const FLAGS: Readonly<Record<string, ValueFlagKey>> = {
  '--data': 'data',
  '--es': 'es',
  '--expect-cluster': 'expectCluster',
  '--kibana': 'kibana',
  '--index': 'index',
};
const UNFINISHED = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

export const parseArgs = (argv: readonly string[]): ResetArgs => {
  const args: Partial<ResetArgs> = {
    kibana: 'http://localhost:5601',
    index: '.alerts-security.alerts-default',
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const key = FLAGS[argv[i]];
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (key) args[key] = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  (['data', 'es', 'expectCluster'] as const).forEach((name) => {
    if (!args[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  return args as ResetArgs;
};

const auth = (): string =>
  `Basic ${Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64')}`;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const call = async <T>(
  base: string,
  method: string,
  url: string,
  body?: RequestBody,
  headers: Headers = {}
): Promise<T> => {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      Authorization: auth(),
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 400)}`);
  return (text ? JSON.parse(text) : undefined) as T;
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const es = <T>(method: string, url: string, body?: RequestBody): Promise<T> =>
    call<T>(args.es, method, url, body);
  const kibana = <T>(
    method: string,
    url: string,
    body?: RequestBody,
    headers?: Headers
  ): Promise<T> => call<T>(args.kibana, method, url, body, headers);
  const report: ResetReport = { dryRun: args.dryRun };

  const { cluster_name: cluster } = await es<ClusterInfo>('GET', '/');
  if (cluster !== args.expectCluster) {
    throw new Error(`refusing to run: cluster is "${cluster}", expected "${args.expectCluster}"`);
  }

  // 1. Unfinished workflow executions.
  const unfinishedQuery = { bool: { must_not: [{ terms: { status: UNFINISHED } }] } };
  const searchUnfinished = (): Promise<ExecutionSearch> =>
    es<ExecutionSearch>('POST', '/.workflows-executions/_search', {
      size: 500,
      query: unfinishedQuery,
      _source: ['id'],
    });
  const first = await searchUnfinished();
  report.unfinishedExecutions = first.hits.total.value;

  // Cancel first and wait, so that no workflow writes a note after the notes below were collected. One search returns at most
  // 500 executions and cancelling can start more (reviews, proposals), so it goes in rounds until none are left. A reset of a
  // run with a deep queue (the 5,000-unit run left 414) needed 3 separate runs of the script before this loop.
  if (!args.dryRun) {
    let round = first;
    for (let attempt = 0; attempt < 20 && round.hits.hits.length > 0; attempt++) {
      for (const hit of round.hits.hits) {
        await kibana<undefined>(
          'POST',
          `/api/workflows/executions/${hit._source.id}/cancel`,
          undefined,
          {
            'elastic-api-version': '2023-10-31',
          }
        );
      }
      await sleep(3000);
      round = await searchUnfinished();
    }
  }

  // 2. Proposals and investigation impact records.
  const plainIndices = ['.kibana-proposals-*', '.kibana-investigation-impact-*'];
  const plainDocuments: Record<string, number> = {};
  report.plainDocuments = plainDocuments;
  for (const index of plainIndices) {
    plainDocuments[index] = (await es<Count>('GET', `/${index}/_count`)).count;
  }

  // 3. Notes on alerts that carry an az: tag.
  const tagged = await es<IdSearch>('POST', `/${args.index}/_search`, {
    size: 10000,
    _source: false,
    query: { prefix: { 'kibana.alert.workflow_tags': 'az:' } },
  });
  const taggedAlertIds = tagged.hits.hits.map((hit) => hit._id);
  report.taggedAlerts = taggedAlertIds.length;
  const notes: IdSearch = taggedAlertIds.length
    ? await es<IdSearch>('POST', '/.kibana_security_solution/_search', {
        size: 10000,
        _source: false,
        query: {
          bool: {
            filter: [
              { term: { type: 'siem-ui-timeline-note' } },
              { terms: { 'siem-ui-timeline-note.eventId': taggedAlertIds } },
            ],
          },
        },
      })
    : { hits: { hits: [] } };
  const noteIds = notes.hits.hits.map((hit) => hit._id.replace(/^siem-ui-timeline-note:/, ''));
  report.notes = noteIds.length;

  // 4. Conversations of the Alert Triage worker.
  const conversations = await kibana<ConversationList>('GET', '/api/agent_builder/conversations');
  const conversationIds = (conversations.results ?? [])
    .filter((conversation) => String(conversation.title).startsWith('Alert Triage'))
    .map((conversation) => conversation.id);
  report.conversations = conversationIds.length;

  report.alertsBefore = (await es<Count>('GET', `/${args.index}/_count`)).count;

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  for (const index of plainIndices) {
    await es<undefined>('POST', `/${index}/_delete_by_query?refresh=true&conflicts=proceed`, {
      query: { match_all: {} },
    });
  }
  for (let i = 0; i < noteIds.length; i += 100) {
    await kibana<undefined>(
      'DELETE',
      '/api/note',
      { noteIds: noteIds.slice(i, i + 100) },
      { 'elastic-api-version': '2023-10-31' }
    );
  }
  for (const id of conversationIds) {
    await kibana<undefined>('DELETE', `/api/agent_builder/conversations/${id}`);
  }
  await es<undefined>('POST', `/${args.index}/_delete_by_query?refresh=true&conflicts=proceed`, {
    query: { match_all: {} },
  });
  execFileSync(
    process.execPath,
    [
      path.join(__dirname, 'replay_alerts_cli.js'),
      '--data',
      args.data,
      '--es',
      args.es,
      '--expect-cluster',
      args.expectCluster,
      '--index',
      args.index,
      '--rule-map',
      path.join(args.data, 'rule_map.json'),
      '--slice-hours',
      '24',
      '--backfill',
    ],
    { stdio: 'ignore' }
  );

  // Verify.
  const after: Record<string, number> = {
    alerts: (await es<Count>('GET', `/${args.index}/_count`)).count,
    alertsWithAzTag: (
      await es<Count>('POST', `/${args.index}/_count`, {
        query: { prefix: { 'kibana.alert.workflow_tags': 'az:' } },
      })
    ).count,
    unfinishedExecutions: (
      await es<Count>('POST', '/.workflows-executions/_count', { query: unfinishedQuery })
    ).count,
    notes: (
      await es<Count>('POST', '/.kibana_security_solution/_count', {
        query: { term: { type: 'siem-ui-timeline-note' } },
      })
    ).count,
    conversations: (
      (await kibana<ConversationList>('GET', '/api/agent_builder/conversations')).results ?? []
    ).length,
  };
  report.after = after;
  for (const index of plainIndices) {
    after[index] = (await es<Count>('GET', `/${index}/_count`)).count;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  // Fail loud: anything of the run that is still there means the next run does not start clean.
  const dirty = Object.entries(after).filter(([key, count]) => key !== 'alerts' && count !== 0);
  if (dirty.length > 0)
    throw new Error(`not clean after the reset: ${JSON.stringify(Object.fromEntries(dirty))}`);
};
