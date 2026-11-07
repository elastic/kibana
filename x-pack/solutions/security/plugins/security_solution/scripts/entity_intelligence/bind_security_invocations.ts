/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants } from 'fs';
import { open } from 'fs/promises';
import { parseArgs } from 'util';
import { Client } from '@elastic/elasticsearch';
import type { CodexObservation } from './codex_session_types';
import { codexIndexName, validateCodexTarget } from './codex_index';
import { bindSecurityInvocation } from './security_invocation';
import { parseSecurityEvents, readSecurityEvents } from './setup_security_story';

/** Resolves complete native call evidence and writes a new bounded file without modifying source observations. */
export const runBindSecurityInvocationsCli = async (args: readonly string[]): Promise<void> => {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    options: {
      events: { type: 'string' },
      output: { type: 'string' },
      'space-id': { type: 'string', default: 'default' },
      'es-url': { type: 'string' },
    },
  });
  if (!values.events || !values.output)
    throw new Error('Supply --events and a new --output NDJSON path.');
  const spaceId = values['space-id'] ?? 'default';
  const events = await readSecurityEvents(values.events, spaceId);
  const first = events[0].entity_intelligence.agent;
  if (
    !first ||
    first.provider !== 'codex' ||
    !first.session_id ||
    events.some(
      (event) =>
        event.entity_intelligence.agent?.id !== first.id ||
        event.entity_intelligence.agent?.session_id !== first.session_id ||
        event.entity_intelligence.agent?.provider !== 'codex'
    )
  )
    throw new Error('Bind one exact Codex installation and session per file.');
  const basic = process.env.ES_AUTH ?? 'elastic:changeme';
  const colon = basic.indexOf(':');
  const client = new Client({
    node: validateCodexTarget(
      values['es-url'] ?? process.env.ES_URL ?? 'http://localhost:9200',
      false
    ).toString(),
    auth: process.env.ES_API_KEY
      ? { apiKey: process.env.ES_API_KEY }
      : {
          username: process.env.ES_USERNAME ?? basic.slice(0, colon),
          password: process.env.ES_PASSWORD ?? basic.slice(colon + 1),
        },
    requestTimeout: 30_000,
  });
  try {
    const response = await client.search<CodexObservation>({
      index: codexIndexName(spaceId),
      size: 1000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { term: { 'agent.id': first.id } },
            { term: { 'agent.type': 'codex' } },
            { term: { 'session.id': first.session_id } },
            { term: { 'kibana.space_id': spaceId } },
            { term: { 'event.action': 'tool_call' } },
            { term: { 'source.observation_type': 'native_tool_completion' } },
            { term: { 'tool.name': 'exec_command' } },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      _source: [
        'agent',
        'session.id',
        'kibana.space_id',
        'event',
        'tool',
        'turn',
        'process',
        'source',
        'content.mode',
        'content.input',
      ],
    });
    const total = response.hits.total;
    if (
      !total ||
      (typeof total !== 'number' && total.relation !== 'eq') ||
      (typeof total === 'number' ? total : total.value) > 1000 ||
      response.timed_out ||
      response._shards.failed
    ) {
      throw new Error(
        'Invocation evidence is incomplete or exceeds the 1,000-call bound; no binding was written.'
      );
    }
    const observations = response.hits.hits.flatMap((hit) =>
      hit._id ? [{ _index: hit._index, _id: hit._id, _source: hit._source }] : []
    );
    const bound = events.map((event) => bindSecurityInvocation(event, observations));
    const contents = `${bound.map((event) => JSON.stringify(event)).join('\n')}\n`;
    parseSecurityEvents(contents, spaceId);
    const file = await open(
      values.output,
      constants.O_WRONLY + constants.O_CREAT + constants.O_EXCL + constants.O_NOFOLLOW,
      0o600
    );
    try {
      await file.writeFile(contents, 'utf8');
    } finally {
      await file.close();
    }
    process.stdout.write(
      `${JSON.stringify({
        bound: bound.length,
        nativeCallsChecked: observations.length,
        correlation: 'exact_request_id',
        indexed: false,
      })}\n`
    );
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  runBindSecurityInvocationsCli(process.argv.slice(2)).catch(() => {
    process.stderr.write(
      'Invocation binding failed. Verify that every request has exactly one imported completed native call with the expected exit code; existing output files are never overwritten.\n'
    );
    process.exitCode = 1;
  });
}
