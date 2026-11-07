/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants } from 'fs';
import { mkdir, open, readFile, rename, writeFile } from 'fs/promises';
import { userInfo } from 'os';
import { dirname, join, resolve } from 'path';
import { randomBytes, randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { createCodexLocalOwner } from './codex_identity';
import { validateCodexTarget } from './codex_index';
import { codexHash } from './codex_session_parser';
import {
  claudeDesktopIndexName,
  ensureClaudeDesktopIndex,
  indexClaudeDesktopObservations,
} from './claude_desktop_index';
import {
  CLAUDE_DESKTOP_PARSER_REVISION,
  parseClaudeDesktopAudit,
} from './claude_desktop_session_parser';

interface ImportState {
  version: 1;
  agentId: string;
  hashSalt: string;
  fingerprints: Record<string, string>;
}
const loadState = async (path: string): Promise<ImportState> => {
  try {
    const state: ImportState = JSON.parse(await readFile(path, 'utf8'));
    if (
      state.version !== 1 ||
      !/^claude-desktop-[a-f0-9-]{36}$/.test(state.agentId) ||
      !/^[a-f0-9]{64}$/.test(state.hashSalt) ||
      !state.fingerprints ||
      typeof state.fingerprints !== 'object' ||
      Array.isArray(state.fingerprints) ||
      Object.values(state.fingerprints).some(
        (value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)
      )
    ) {
      throw new Error('Invalid Claude Desktop importer state.');
    }
    return state;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return {
        version: 1,
        agentId: `claude-desktop-${randomUUID()}`,
        hashSalt: randomBytes(32).toString('hex'),
        fingerprints: {},
      };
    throw new Error('Claude Desktop importer state cannot be read; contents were not logged.');
  }
};
const saveState = async (path: string, state: ImportState): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, path);
};
const readAudit = async (
  path: string
): Promise<
  { text: string; uid: number; size: number; mtimeMs: number; complete: boolean } | undefined
> => {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY + constants.O_NOFOLLOW);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw new Error('Claude Desktop audit file is unavailable.');
  }
  try {
    const before = await handle.stat();
    const limit = 16 * 1024 * 1024;
    if (!before.isFile() || before.size > limit)
      throw new Error('Claude Desktop audit file exceeds the bounded source contract.');
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        length,
        Math.min(64 * 1024, buffer.length - length),
        null
      );
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > limit)
      throw new Error('Claude Desktop audit file exceeds the bounded source contract.');
    const after = await handle.stat();
    return {
      text: buffer.subarray(0, length).toString('utf8'),
      uid: before.uid,
      size: before.size,
      mtimeMs: before.mtimeMs,
      complete: before.size === after.size && before.mtimeMs === after.mtimeMs,
    };
  } finally {
    await handle.close();
  }
};

run(
  async ({ flags, log }) => {
    const textFlag = (name: string, fallback: string): string =>
      typeof flags[name] === 'string' && flags[name] ? String(flags[name]) : fallback;
    const numberFlag = (
      name: string,
      fallback: number,
      minimum: number,
      maximum: number
    ): number => {
      const value = Number(textFlag(name, String(fallback)));
      if (!Number.isInteger(value) || value < minimum || value > maximum)
        throw new Error(`Invalid --${name}.`);
      return value;
    };
    const auditFlag = textFlag('audit-file', process.env.CLAUDE_DESKTOP_AUDIT_FILE ?? '');
    if (!auditFlag)
      throw new Error('Pass --audit-file with the local Claude Desktop bridge JSONL path.');
    const auditPath = resolve(auditFlag);
    const statePath = resolve(
      textFlag(
        'state-path',
        join(process.cwd(), 'data', 'entity_intelligence', 'claude_desktop_importer_state.json')
      )
    );
    const spaceId = textFlag('space-id', process.env.SPACE_ID ?? 'default');
    const index = claudeDesktopIndexName(spaceId);
    const target = validateCodexTarget(
      textFlag('es-url', process.env.ES_URL ?? 'http://127.0.0.1:9200'),
      flags['allow-remote'] === true
    );
    const days = numberFlag('days', 30, 1, 3650);
    const maxRecords = numberFlag('max-records', 20_000, 1, 20_000);
    const interval = numberFlag('interval-ms', 60_000, 10_000, 3_600_000);
    const dryRun = flags['dry-run'] === true;
    const watch = flags.watch === true;
    if (watch && dryRun) throw new Error('Use --dry-run for a single bounded preview.');
    const state = await loadState(statePath);
    const local = userInfo();
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
      requestTimeout: 60_000,
    });
    let initialized = false;
    let firstPass = true;
    let stopped = false;
    const stop = (): void => {
      stopped = true;
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
      do {
        const snapshot = await readAudit(auditPath);
        if (!snapshot) {
          log.info(
            'Claude Desktop import: {"sourceAvailable":false,"connections":0,"toolCalls":0}'
          );
        } else {
          const key = codexHash(state.hashSalt, `${target.origin}:${index}:${auditPath}`);
          const owner = createCodexLocalOwner(local, snapshot.uid, state.hashSalt);
          const fingerprint = codexHash(
            state.hashSalt,
            JSON.stringify({
              parserRevision: CLAUDE_DESKTOP_PARSER_REVISION,
              size: snapshot.size,
              mtimeMs: snapshot.mtimeMs,
              owner,
              days,
              maxRecords,
            })
          );
          if (
            !dryRun &&
            !(firstPass && flags.reindex === true) &&
            state.fingerprints[key] === fingerprint
          ) {
            log.info('Claude Desktop import: {"sourceAvailable":true,"unchanged":true}');
          } else {
            const lines = snapshot.text.split('\n');
            const bounded = lines.length > maxRecords + 1;
            const parsed = parseClaudeDesktopAudit(lines.slice(0, maxRecords), {
              agentId: state.agentId,
              spaceId,
              hashSalt: state.hashSalt,
              fileHash: codexHash(state.hashSalt, auditPath),
              ingestedAt: new Date().toISOString(),
              owner,
              localUid: local.uid,
              complete: snapshot.complete && !bounded,
              cutoffTimestamp: Date.now() - days * 86_400_000,
            });
            if (!dryRun && parsed.observations.length) {
              if (!initialized) {
                await ensureClaudeDesktopIndex(client, index);
                initialized = true;
              }
              await indexClaudeDesktopObservations(client, index, parsed.observations);
              await client.indices.refresh({ index });
              if (
                snapshot.complete &&
                !bounded &&
                parsed.rejectedRecords === 0 &&
                parsed.conflictingRecords === 0
              )
                state.fingerprints[key] = fingerprint;
              await saveState(statePath, state);
            }
            log.info(
              `${dryRun ? 'Claude Desktop dry run' : 'Claude Desktop import'}: ${JSON.stringify({
                sourceAvailable: true,
                connections: parsed.observations.filter((item) => item.event.action === 'session')
                  .length,
                toolCalls: parsed.acceptedRecords,
                rejected: parsed.rejectedRecords,
                filtered: parsed.filteredRecords,
                duplicates: parsed.duplicateRecords,
                conflicts: parsed.conflictingRecords,
                bounded,
              })}`
            );
          }
        }
        firstPass = false;
        if (watch && !stopped) await new Promise<void>((done) => setTimeout(done, interval));
      } while (watch && !stopped);
    } catch {
      throw new Error(
        'Claude Desktop import failed. Check the bounded audit file, local Elasticsearch credentials and index privileges; raw records and responses are not logged.'
      );
    } finally {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      await client.close();
    }
  },
  {
    description:
      'Import actual local Claude Desktop MCP tool audit records as connections, not chat transcripts.',
    flags: {
      string: [
        'audit-file',
        'state-path',
        'space-id',
        'es-url',
        'days',
        'max-records',
        'interval-ms',
      ],
      boolean: ['dry-run', 'allow-remote', 'reindex', 'watch'],
      help: '--audit-file <path> Required bridge JSONL source (read-only)\n--dry-run Report counts without creating an index or saving state\n--watch Import changes every 60 seconds; default is one pass\n--reindex Replay an unchanged file on the first pass\n--allow-remote Explicitly allow a non-loopback Elasticsearch destination',
    },
  }
);
