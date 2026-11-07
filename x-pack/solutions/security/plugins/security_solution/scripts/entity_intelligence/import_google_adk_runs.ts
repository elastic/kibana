/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants } from 'fs';
import { open, readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { validateCodexTarget } from './codex_index';
import {
  ensureGoogleAdkIndex,
  googleAdkIndexName,
  indexGoogleAdkObservations,
} from './google_adk_index';
import { googleAdkHash, parseGoogleAdkRuns } from './google_adk_run_parser';

const readBounded = async (path: string, maxBytes = 1024 * 1024): Promise<string> => {
  const handle = await open(path, constants.O_RDONLY + constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > maxBytes)
      throw new Error('Source file exceeds size limit.');
    const buffer = Buffer.alloc(before.size + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!chunk.bytesRead) break;
      bytesRead += chunk.bytesRead;
    }
    const after = await handle.stat();
    if (bytesRead !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs)
      throw new Error('Source changed during import.');
    return buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }
};
const optionalRead = async (path: string): Promise<string | undefined> => {
  try {
    return await readBounded(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
};
const optionalDirectories = async (path: string): Promise<string[]> => {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
};

run(
  async ({ flags, log }) => {
    const textFlag = (name: string, fallback = ''): string =>
      typeof flags[name] === 'string' && flags[name] ? String(flags[name]) : fallback;
    const exportFlag = textFlag('export-dir');
    const projectId = textFlag('project');
    if (!exportFlag || !projectId)
      throw new Error('Pass --export-dir and --project for a bounded Google evidence bundle.');
    const exportDir = resolve(exportFlag);
    const stateDir = textFlag('state-dir') ? resolve(textFlag('state-dir')) : undefined;
    const files = (await readdir(exportDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^run-[a-f0-9-]{36}\.json$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    if (!files.length || files.length > 100)
      throw new Error('An import must contain 1–100 exported runs.');
    const records: string[] = [];
    for (const file of files) records.push(await readBounded(join(exportDir, file)));
    let audit = '';
    try {
      audit = await readBounded(join(exportDir, 'cloud-audit.jsonl'), 16 * 1024 * 1024);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    const auditLines = audit.split('\n');
    if (auditLines.length > 5001) throw new Error('Audit bundle exceeds 5000 records.');
    const changeRecords: string[] = [];
    if (stateDir) {
      const dirs = await optionalDirectories(join(stateDir, 'changes'));
      if (dirs.length > 500) throw new Error('Change receipts exceed 500 records.');
      for (const dir of dirs)
        changeRecords.push(await readBounded(join(stateDir, 'changes', dir, 'change.json')));
    }
    const resourceContents = new Map<string, string>();
    try {
      const versions = await readdir(join(exportDir, 'resource-versions'), { withFileTypes: true });
      if (versions.length > 2000) throw new Error('Resource versions exceed 2000 records.');
      const resourceFiles = versions.filter(
        (version) => version.isFile() && /^[a-f0-9]{64}\.json$/.test(version.name)
      );
      for (const version of resourceFiles) {
        const content = await readBounded(
          join(exportDir, 'resource-versions', version.name),
          32_768
        );
        if (googleAdkHash(content) === version.name.slice(0, 64))
          resourceContents.set(version.name.slice(0, 64), content);
      }
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    const spaceId = textFlag('space-id', process.env.SPACE_ID ?? 'default');
    const index = googleAdkIndexName(spaceId);
    const result = parseGoogleAdkRuns(records, {
      projectId,
      spaceId,
      ingestedAt: new Date().toISOString(),
      auditLines,
      changeRecords,
      resourceContents,
      ownership:
        (await optionalRead(join(exportDir, 'ownership.json'))) ??
        (stateDir ? await optionalRead(join(stateDir, 'ownership.json')) : undefined),
      readback: await optionalRead(join(exportDir, 'resource_verification.json')),
    });
    if (result.rejectedRuns || result.conflictingRuns)
      throw new Error(
        `Evidence validation failed: ${result.rejectedRuns} rejected, ${result.conflictingRuns} conflicting runs; no documents were written.`
      );
    if (flags['dry-run'] !== true) {
      const target = validateCodexTarget(
        textFlag('es-url', process.env.ES_URL ?? 'http://127.0.0.1:9200'),
        flags['allow-remote'] === true
      );
      const basic = process.env.ES_AUTH ?? 'elastic:changeme';
      const colon = basic.indexOf(':');
      const client = new Client({
        node: target.toString(),
        requestTimeout: 60_000,
        auth: process.env.ES_API_KEY
          ? { apiKey: process.env.ES_API_KEY }
          : {
              username: process.env.ES_USERNAME ?? basic.slice(0, colon),
              password: process.env.ES_PASSWORD ?? basic.slice(colon + 1),
            },
      });
      try {
        await ensureGoogleAdkIndex(client, index);
        await indexGoogleAdkObservations(client, index, result.observations);
        await client.indices.refresh({ index });
      } finally {
        await client.close();
      }
    }
    const sessions = result.observations.filter((item) => item.event.action === 'session');
    log.info(
      JSON.stringify({
        dryRun: flags['dry-run'] === true,
        index,
        sessions: sessions.length,
        toolCalls: result.observations.length - sessions.length,
        auditedToolCalls: result.observations.filter(
          (item) => item.event.action === 'tool_call' && item.google_adk.audit_matches.length > 0
        ).length,
        linkedDocumentEdits: sessions.reduce(
          (sum, item) =>
            sum + item.google_adk.resources.filter((resource) => resource.editor).length,
          0
        ),
        sourcePolicyMatches: sessions.reduce(
          (sum, item) => sum + item.google_adk.source_policy.matches.length,
          0
        ),
        elasticFindingsCreated: 0,
      })
    );
  },
  {
    description:
      'Import executed Google ADK runs and exact audit joins; source policy matches remain evidence, not Elastic findings.',
    flags: {
      string: ['export-dir', 'state-dir', 'project', 'space-id', 'es-url'],
      boolean: ['dry-run', 'allow-remote'],
      help: '--export-dir <path> Export directory containing run-<UUID>.json\n--project <id> Expected runtime service-account project\n--state-dir <path> Optional provisioning state with document change receipts\n--dry-run Validate and report without indexing\n--allow-remote Explicitly permit a remote Elasticsearch target',
    },
  }
);
