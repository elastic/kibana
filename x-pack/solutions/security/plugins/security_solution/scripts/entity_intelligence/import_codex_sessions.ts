/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReadStream } from 'fs';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'fs/promises';
import { homedir, userInfo } from 'os';
import { dirname, join, resolve } from 'path';
import { createInterface } from 'readline';
import { randomBytes, randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { createCodexLocalOwner } from './codex_identity';
import { createContentRedactor } from '../../common/entity_intelligence/content_redaction';
import { observeCodexContentLine } from './codex_content';
import { loadCodexTitles } from './codex_titles';
import { CODEX_PARSER_REVISION, codexHash, createCodexSessionParser } from './codex_session_parser';
import {
  codexIndexName,
  ensureCodexIndex,
  indexCodexObservations,
  validateCodexTarget,
} from './codex_index';

interface FileFingerprint {
  parserRevision?: number;
  ownerFingerprint?: string;
  contentFingerprint?: string;
  size: number;
  mtimeMs: number;
}
interface ImportState {
  version: 1;
  agentId: string;
  hashSalt: string;
  files: Record<string, FileFingerprint>;
}
interface SourceFile extends FileFingerprint {
  path: string;
  uid: number;
}

const loadState = async (path: string): Promise<ImportState> => {
  try {
    const state: ImportState = JSON.parse(await readFile(path, 'utf8'));
    if (
      state.version !== 1 ||
      !/^codex-[a-f0-9-]{36}$/.test(state.agentId) ||
      !/^[a-f0-9]{64}$/.test(state.hashSalt) ||
      !state.files ||
      typeof state.files !== 'object'
    ) {
      throw new Error('Invalid importer state; preserve or explicitly replace the state file.');
    }
    return state;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        version: 1,
        agentId: `codex-${randomUUID()}`,
        hashSalt: randomBytes(32).toString('hex'),
        files: {},
      };
    }
    throw new Error(
      'Cannot read importer state; verify the state file without exposing its contents.'
    );
  }
};

const saveState = async (path: string, state: ImportState): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, path);
};

const discoverFiles = async (root: string, cutoff: number): Promise<SourceFile[]> => {
  const result: SourceFile[] = [];
  const visit = async (directory: string, depth: number): Promise<void> => {
    if (depth > 4) return;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path, depth + 1);
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const info = await stat(path);
        if (info.mtimeMs >= cutoff)
          result.push({ path, size: info.size, mtimeMs: info.mtimeMs, uid: info.uid });
      }
    }
  };
  await visit(root, 0);
  return result.sort((left, right) => right.mtimeMs - left.mtimeMs);
};

run(
  async ({ flags, log }) => {
    const textFlag = (name: string, fallback: string): string => {
      const value = flags[name];
      return typeof value === 'string' && value.length > 0 ? value : fallback;
    };
    const integerFlag = (name: string, fallback: number, min: number, max: number): number => {
      const number = Number(textFlag(name, String(fallback)));
      if (!Number.isInteger(number) || number < min || number > max)
        throw new Error(`Invalid --${name}.`);
      return number;
    };
    const sourceRoot = resolve(
      textFlag(
        'sessions-dir',
        join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'sessions')
      )
    );
    const statePath = resolve(
      textFlag(
        'state-path',
        join(process.cwd(), 'data', 'entity_intelligence', 'codex_importer_state.json')
      )
    );
    const spaceId = textFlag('space-id', process.env.SPACE_ID ?? 'default');
    const index = codexIndexName(spaceId);
    const target = validateCodexTarget(
      textFlag('es-url', process.env.ES_URL ?? 'http://localhost:9200'),
      flags['allow-remote'] === true
    );
    const days = integerFlag('days', 30, 1, 3650);
    const maxFiles = integerFlag('max-files', 200, 1, 2000);
    const interval = integerFlag('interval-ms', 15_000, 1000, 3_600_000);
    const dryRun = flags['dry-run'] === true;
    const watch = flags.watch === true;
    const contentMode = textFlag('content', 'metadata-only');
    if (contentMode !== 'metadata-only' && contentMode !== 'redacted')
      throw new Error('Invalid --content; use metadata-only or redacted.');
    const contentRedactor = contentMode === 'redacted' ? createContentRedactor() : undefined;
    const titlesPath = resolve(textFlag('titles-db', join(dirname(sourceRoot), 'state_5.sqlite')));
    const learnedFiles = new Map<string, string>();
    let learnedSecrets = 0;
    const state = await loadState(statePath);
    const localAccount = userInfo();
    const checkpoints = new Map(Object.entries(state.files));
    let reindex = flags.reindex === true;
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
    let stopped = false;
    const stop = (): void => {
      stopped = true;
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
      if (!dryRun) {
        await ensureCodexIndex(client, index);
        await saveState(statePath, { ...state, files: Object.fromEntries(checkpoints) });
      }
      do {
        const files = await discoverFiles(sourceRoot, Date.now() - days * 86_400_000);
        const selected = files.slice(0, maxFiles);
        const sessionIdFor = (file: SourceFile): string | undefined =>
          /([a-f0-9-]{36})\.jsonl$/.exec(file.path)?.[1];
        const titles = contentRedactor
          ? loadCodexTitles(
              titlesPath,
              selected.flatMap((file) => sessionIdFor(file) ?? [])
            )
          : new Map<string, string>();
        if (contentRedactor) {
          for (const title of titles.values()) contentRedactor.observe(title);
          for (const file of selected) {
            if (stopped) break;
            const fingerprint = `${file.size}:${file.mtimeMs}`;
            if (file.size <= 64 * 1024 * 1024 && learnedFiles.get(file.path) !== fingerprint) {
              const input = createReadStream(file.path, { encoding: 'utf8' });
              const lines = createInterface({ input, crlfDelay: Infinity });
              let count = 0;
              for await (const line of lines) {
                if (++count > 200_000) break;
                observeCodexContentLine(line, contentRedactor);
              }
              input.destroy();
              learnedFiles.set(file.path, fingerprint);
            }
          }
          if (contentRedactor.getRevision() !== learnedSecrets) reindex = true;
          learnedSecrets = contentRedactor.getRevision();
        }
        const totals = {
          selected: selected.length,
          excludedByLimit: Math.max(0, files.length - maxFiles),
          importedSessions: 0,
          toolCalls: 0,
          unchanged: 0,
          oversized: 0,
          incomplete: 0,
          malformedLines: 0,
        };
        const importFile = async (file: SourceFile): Promise<void> => {
          if (file.size > 64 * 1024 * 1024) {
            totals.oversized++;
            return;
          }
          const fileHash = codexHash(state.hashSalt, file.path);
          const checkpointKey = codexHash(state.hashSalt, `${target.origin}:${index}:${file.path}`);
          const previous = checkpoints.get(checkpointKey);
          const sourceSessionId = sessionIdFor(file);
          const title = sourceSessionId ? titles.get(sourceSessionId) : undefined;
          const contentFingerprint = codexHash(
            state.hashSalt,
            JSON.stringify([contentMode, title])
          );
          const owner = createCodexLocalOwner(localAccount, file.uid, state.hashSalt);
          const ownerFingerprint = codexHash(
            state.hashSalt,
            `${localAccount.uid}:${localAccount.username}:${file.uid}`
          );
          if (
            !dryRun &&
            !reindex &&
            previous?.parserRevision === CODEX_PARSER_REVISION &&
            previous.ownerFingerprint === ownerFingerprint &&
            previous.contentFingerprint === contentFingerprint &&
            previous?.size === file.size &&
            previous.mtimeMs === file.mtimeMs
          ) {
            totals.unchanged++;
            return;
          }
          const parser = createCodexSessionParser({
            agentId: state.agentId,
            owner,
            spaceId,
            fileHash,
            hashSalt: state.hashSalt,
            expectedSessionId: sourceSessionId,
            contentRedactor,
            title,
            ingestedAt: new Date().toISOString(),
          });
          if (previous && file.size < previous.size) parser.markIncomplete();
          const input = createReadStream(file.path, { encoding: 'utf8' });
          const lines = createInterface({ input, crlfDelay: Infinity });
          let lineCount = 0;
          for await (const line of lines) {
            if (++lineCount > 200_000) {
              parser.markIncomplete();
              break;
            }
            parser.consume(line);
          }
          input.destroy();
          const parsed = parser.finalize();
          totals.malformedLines += parsed.malformedLines;
          if (!parsed.summaryComplete) totals.incomplete++;
          if (parsed.observations.length === 0) return;
          if (!dryRun) {
            await indexCodexObservations(client, index, parsed.observations);
            checkpoints.set(checkpointKey, {
              size: file.size,
              mtimeMs: file.mtimeMs,
              parserRevision: CODEX_PARSER_REVISION,
              ownerFingerprint,
              contentFingerprint,
            });
          }
          totals.importedSessions++;
          totals.toolCalls += parsed.observations.length - 1;
        };
        for (const file of selected) {
          if (stopped) break;
          await importFile(file);
        }
        if (!dryRun) {
          await saveState(statePath, { ...state, files: Object.fromEntries(checkpoints) });
          await client.indices.refresh({ index });
        }
        reindex = false;
        log.info(JSON.stringify({ index, agentId: state.agentId, dryRun, ...totals }));
        if (watch && !stopped)
          await new Promise<void>((done) => {
            const timer = setTimeout(done, interval);
            const abortWait = (): void => {
              clearTimeout(timer);
              done();
            };
            process.once('SIGINT', abortWait);
            process.once('SIGTERM', abortWait);
            setTimeout(() => {
              process.removeListener('SIGINT', abortWait);
              process.removeListener('SIGTERM', abortWait);
            }, interval).unref();
          });
      } while (watch && !stopped);
    } catch (error) {
      log.error(
        'Codex import failed. Check source access, local Elasticsearch credentials and index privileges. Raw records and client error details were suppressed.'
      );
      throw new Error(
        error instanceof Error ? `Import stopped (${error.name}).` : 'Import stopped.'
      );
    } finally {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      await client.close();
    }
  },
  {
    description:
      'Import privacy-filtered metadata from real local Codex rollout files into Entity Intelligence.',
    flags: {
      boolean: ['dry-run', 'watch', 'allow-remote', 'reindex'],
      string: [
        'sessions-dir',
        'state-path',
        'es-url',
        'space-id',
        'days',
        'max-files',
        'interval-ms',
        'content',
        'titles-db',
      ],
      help: `
      --content          metadata-only (default) or redacted (bounded local prompts, titles and tool inputs).
      --titles-db        Read-only local Codex state database (default ../state_5.sqlite from sessions-dir).
      --dry-run          Parse and report counts without writes or a network connection.
      --reindex          Replay selected files with existing stable document IDs.
      --watch            Reimport changed files every 15 seconds; interrupt to stop.
      --sessions-dir     Local Codex sessions directory (default CODEX_HOME/sessions).
      --state-path       Persistent importer state (default data/entity_intelligence/codex_importer_state.json).
      --es-url           Elasticsearch URL (default http://localhost:9200; loopback only).
      --space-id         Destination Kibana space (default default).
      --days             Select files modified within this many days (default 30).
      --max-files        Maximum newest files per pass (default 200).
      --interval-ms      Watch polling interval (default 15000).
      --allow-remote     Explicitly permit exporting the metadata to a non-loopback endpoint.
      Credentials use ES_API_KEY or ES_USERNAME/ES_PASSWORD or ES_AUTH; never command-line flags.
    `,
    },
  }
);
