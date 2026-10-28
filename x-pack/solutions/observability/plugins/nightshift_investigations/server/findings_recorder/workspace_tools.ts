/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { posix } from 'path';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { OutputRedactor } from '../tools/sandbox_bash/output_redactor';
import {
  RECORDER_LIST_MAX_ENTRIES,
  RECORDER_READ_DEFAULT_BYTES,
  RECORDER_READ_MAX_BYTES,
  RECORDER_RESULTS_DIR,
  RECORDER_WORKSPACE_ROOT,
} from './constants';

/** The tools the final pass may call to read the investigation's workspace. Read-only. */
export const RECORDER_READ_FILE_TOOL = 'recorder_read_file';
export const RECORDER_LIST_FILES_TOOL = 'recorder_list_files';

export const RECORDER_READ_FILE_SCHEMA = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Absolute path of a file under /workspace.',
    },
    offset: {
      type: 'number',
      description: 'Byte offset to start reading from. Defaults to 0.',
    },
    length: {
      type: 'number',
      description: `Bytes to read, at most ${RECORDER_READ_MAX_BYTES}. Defaults to ${RECORDER_READ_DEFAULT_BYTES}.`,
    },
  },
  required: ['path'],
} as const;

export const RECORDER_LIST_FILES_SCHEMA = {
  type: 'object',
  properties: {
    dir: {
      type: 'string',
      description: 'Absolute path of a directory under /workspace.',
    },
  },
  required: ['dir'],
} as const;

/** What the final pass can do in the workspace: read what exists and leave the round's results. */
export interface RecorderWorkspace {
  /** Writes the full text of tool results the recorder is shown clipped. */
  writeResults: (files: ReadonlyArray<{ path: string; content: string }>) => Promise<void>;
  readFile: (args: { path: string; offset?: number; length?: number }) => Promise<string>;
  listFiles: (args: { dir: string }) => Promise<string>;
}

/** A directory name is passed to `find` inside single quotes, so only plain characters are allowed. */
const SAFE_PATH = /^[A-Za-z0-9_./ -]+$/;

/**
 * Resolves a model-supplied path to a normalized absolute path under the workspace, or explains
 * why it is not allowed. `..` is resolved before the check, so it cannot climb out.
 */
export const resolveWorkspacePath = (
  raw: unknown
): { ok: true; path: string } | { ok: false; reason: string } => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) {
    return { ok: false, reason: 'A path is required.' };
  }
  if (!SAFE_PATH.test(raw)) {
    return { ok: false, reason: 'The path has characters that are not allowed.' };
  }
  const path = posix.normalize(raw);
  if (path !== RECORDER_WORKSPACE_ROOT && !path.startsWith(`${RECORDER_WORKSPACE_ROOT}/`)) {
    return { ok: false, reason: `Only paths under ${RECORDER_WORKSPACE_ROOT} can be read.` };
  }
  return { ok: true, path };
};

const toInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * A read-only view of one investigation's workspace. Everything it returns passes through the
 * output redactor, as the investigator's own tool results do, so a secret that ended up in a file
 * is not shown to the model.
 */
export const createRecorderWorkspace = ({
  session,
  redactor,
}: {
  session: SandboxSession;
  redactor: OutputRedactor;
}): RecorderWorkspace => ({
  writeResults: async (files) => {
    if (files.length === 0) return;
    await session.mkdirs([RECORDER_RESULTS_DIR]);
    await session.writeFiles(
      files.map(({ path, content }) => ({ path, content: Buffer.from(content, 'utf8') }))
    );
  },

  readFile: async ({ path: rawPath, offset, length }) => {
    const resolved = resolveWorkspacePath(rawPath);
    if (!resolved.ok) return `Error: ${resolved.reason}`;
    const { path } = resolved;

    const [stat] = await session.statFiles([path]);
    if (!stat?.exists) return `Error: ${path} does not exist.`;
    if (stat.is_dir)
      return `Error: ${path} is a directory. List it with ${RECORDER_LIST_FILES_TOOL}.`;

    const start = toInt(offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const count = toInt(length, RECORDER_READ_DEFAULT_BYTES, 1, RECORDER_READ_MAX_BYTES);
    const [result] = await session.readFiles([{ path, maxReadBytes: start + count }]);
    if (!result?.success) return `Error: ${path} could not be read.`;

    const slice = result.content.subarray(start, start + count);
    const end = start + slice.length;
    const more =
      end < stat.size
        ? `\n[bytes ${start}-${end} of ${stat.size}; read on with offset ${end}]`
        : '';
    return `${redactor.redact(slice.toString('utf8'))}${more}`;
  },

  listFiles: async ({ dir: rawDir }) => {
    const resolved = resolveWorkspacePath(rawDir);
    if (!resolved.ok) return `Error: ${resolved.reason}`;
    const { path } = resolved;

    // A fixed command with the validated path quoted: the model never supplies shell syntax.
    const { stdout, exit_code: exitCode } = await session.runCommand({
      command: `find '${path}' -mindepth 1 -maxdepth 1 -printf '%y %s %p\\n' | sort -k3 | head -n ${RECORDER_LIST_MAX_ENTRIES}`,
      timeout_seconds: 15,
    });
    if (exitCode !== 0) return `Error: ${path} could not be listed.`;
    const listing = stdout.trim();
    return redactor.redact(
      listing.length > 0 ? `type size path\n${listing}` : `${path} is empty or does not exist.`
    );
  },
});
