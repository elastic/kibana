/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdir, readFile, rename, stat, writeFile } from 'fs/promises';
import { homedir, userInfo } from 'os';
import { dirname, join, resolve } from 'path';
import { randomBytes, randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { codexHash } from './codex_session_parser';
import { createCodexLocalOwner } from './codex_identity';
import { validateCodexTarget } from './codex_index';
import { cursorIndexName, ensureCursorIndex, indexCursorObservations } from './cursor_index';
import { readCursorState } from './cursor_state_reader';
import { parseCursorSession } from './cursor_session_parser';

interface CursorImportState {
  version: 1;
  agentId: string;
  hashSalt: string;
  fingerprints?: Record<string, string>;
}
const loadState = async (path: string): Promise<CursorImportState> => {
  try {
    const state: CursorImportState = JSON.parse(await readFile(path, 'utf8'));
    if (
      state.version !== 1 ||
      !/^cursor-[a-f0-9-]{36}$/.test(state.agentId) ||
      !/^[a-f0-9]{64}$/.test(state.hashSalt) ||
      (state.fingerprints !== undefined &&
        (typeof state.fingerprints !== 'object' ||
          state.fingerprints === null ||
          Object.values(state.fingerprints).some(
            (value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)
          )))
    )
      throw new Error('Invalid Cursor importer state.');
    return state;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return {
        version: 1,
        agentId: `cursor-${randomUUID()}`,
        hashSalt: randomBytes(32).toString('hex'),
      };
    throw new Error('Cursor importer state is unreadable; no state contents were logged.');
  }
};
const saveState = async (path: string, state: CursorImportState): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, path);
};

run(
  async ({ flags, log }) => {
    const textFlag = (name: string, fallback: string): string =>
      typeof flags[name] === 'string' && flags[name] ? String(flags[name]) : fallback;
    const numberFlag = (name: string, fallback: number, maximum: number): number => {
      const value = Number(textFlag(name, String(fallback)));
      if (!Number.isInteger(value) || value < 1 || value > maximum)
        throw new Error(`Invalid --${name}.`);
      return value;
    };
    const sourcePath = resolve(
      textFlag(
        'state-db',
        join(
          homedir(),
          'Library',
          'Application Support',
          'Cursor',
          'User',
          'globalStorage',
          'state.vscdb'
        )
      )
    );
    const statePath = resolve(
      textFlag(
        'state-path',
        join(process.cwd(), 'data', 'entity_intelligence', 'cursor_importer_state.json')
      )
    );
    const spaceId = textFlag('space-id', process.env.SPACE_ID ?? 'default');
    const index = cursorIndexName(spaceId);
    const target = validateCodexTarget(
      textFlag('es-url', process.env.ES_URL ?? 'http://localhost:9200'),
      flags['allow-remote'] === true
    );
    const days = numberFlag('days', 30, 3650);
    const maxSessions = numberFlag('max-sessions', 100, 500);
    const maxBubbles = numberFlag('max-bubbles', 10000, 20000);
    const dryRun = flags['dry-run'] === true;
    const watch = flags.watch === true;
    const interval = numberFlag('interval-ms', 60000, 3600000);
    if (watch && (dryRun || interval < 10000))
      throw new Error('Watch requires a non-dry import and an interval of at least 10000ms.');
    const state = await loadState(statePath);
    const basic = process.env.ES_AUTH ?? 'elastic:changeme';
    const colon = basic.indexOf(':');
    const client = new Client({
      node: target.toString(),
      auth: process.env.ES_API_KEY
        ? { apiKey: process.env.ES_API_KEY }
        : {
            username: process.env.ES_USERNAME ?? basic.slice(0, colon),
            password: process.env.ES_PASSWORD ?? basic.slice(colon + 1),
          },
      requestTimeout: 60000,
    });
    let firstPass = true;
    try {
      if (!dryRun) {
        await ensureCursorIndex(client, index);
        await saveState(statePath, state);
      }
      do {
        const info = await stat(sourcePath);
        const owner = createCodexLocalOwner(userInfo(), info.uid, state.hashSalt);
        const snapshot = readCursorState(
          sourcePath,
          Date.now() - days * 86_400_000,
          maxSessions,
          maxBubbles
        );
        const totals = {
          sessions: 0,
          interactions: 0,
          prompts: 0,
          partialSessions: 0,
          skippedSessions: 0,
          unavailableRecords: snapshot.unavailableRecords,
          bounded: snapshot.bounded,
        };
        state.fingerprints ??= {};
        for (const item of snapshot.sessions) {
          const key = codexHash(state.hashSalt, `${spaceId}:${item.header.composerId}`);
          const fingerprint = codexHash(
            state.hashSalt,
            JSON.stringify({
              parserRevision: 3,
              header: item.header,
              composer: {
                name: item.composer.name,
                createdAt: item.composer.createdAt,
                subagentInfo: item.composer.subagentInfo,
              },
              bubbles: item.bubbles,
              complete: item.complete,
              owner,
            })
          );
          if (
            !dryRun &&
            !(firstPass && flags.reindex === true) &&
            state.fingerprints[key] === fingerprint
          ) {
            totals.skippedSessions++;
          } else {
            const observations = parseCursorSession(item.header, item.composer, item.bubbles, {
              agentId: state.agentId,
              spaceId,
              owner,
              hashSalt: state.hashSalt,
              fileHash: codexHash(state.hashSalt, sourcePath),
              ingestedAt: new Date().toISOString(),
              complete: item.complete,
            });
            const summary = observations.find((document) => document.event.action === 'session');
            if (summary) {
              if (!dryRun) {
                await indexCursorObservations(client, index, observations);
                state.fingerprints[key] = fingerprint;
              }
              totals.sessions++;
              totals.interactions += observations.length - 1;
              totals.prompts += summary.content?.prompts?.length ?? 0;
              if (!summary.session.summary_complete) totals.partialSessions++;
            }
          }
        }
        if (!dryRun) {
          await client.indices.refresh({ index });
          await saveState(statePath, state);
        }
        log.info(`${dryRun ? 'Cursor dry run' : 'Cursor import'}: ${JSON.stringify(totals)}`);
        firstPass = false;
        if (watch) await new Promise<void>((done) => setTimeout(done, interval));
      } while (watch);
    } catch {
      throw new Error(
        'Cursor import failed. Check local source access, Elasticsearch credentials and index privileges; raw records and responses are not logged.'
      );
    } finally {
      await client.close();
    }
  },
  {
    description:
      'Read recorded Cursor conversations from local SQLite and import bounded, redacted evidence into a space-specific Elasticsearch index.',
    flags: {
      string: [
        'state-db',
        'state-path',
        'space-id',
        'es-url',
        'days',
        'max-sessions',
        'max-bubbles',
        'interval-ms',
      ],
      boolean: ['dry-run', 'allow-remote', 'watch', 'reindex'],
      help: `--state-db <path>       Cursor globalStorage state.vscdb (read-only)\n--space-id <id>         Target Kibana space (default: default)\n--max-sessions <n>      Recent conversations to read (default: 100)\n--max-bubbles <n>       Maximum bubbles per conversation (default: 10000)\n--dry-run              Report counts without indexing or saving state\n--watch                Refresh changed conversations every 60s (--interval-ms overrides)\n--reindex              Replay unchanged sessions on the first pass\n--allow-remote         Explicitly allow exporting to non-loopback Elasticsearch`,
    },
  }
);
