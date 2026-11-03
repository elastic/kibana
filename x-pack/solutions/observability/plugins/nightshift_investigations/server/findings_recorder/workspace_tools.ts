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
  RECORDER_FILE_MAX_BYTES,
  RECORDER_READ_DEFAULT_BYTES,
  RECORDER_READ_MAX_BYTES,
  RECORDER_REDACTION_MARGIN_BYTES,
  RECORDER_RESULTS_DIR,
  RECORDER_WORKSPACE_ROOT,
} from './constants';

/** The tool the final pass may call to read the investigation's workspace. Read-only. */
export const RECORDER_READ_FILE_TOOL = 'recorder_read_file';

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

/** What the final pass can do in the workspace: read what exists, and leave the round's results. */
export interface RecorderWorkspace {
  /** Writes the full text of tool results the recorder is shown clipped. */
  writeResults: (files: ReadonlyArray<{ path: string; content: string }>) => Promise<void>;
  readFile: (args: { path: string; offset?: number; length?: number }) => Promise<string>;
}

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
}): RecorderWorkspace => {
  // A pass reads a file in pages, so the redacted file is kept for the pass instead of fetching
  // and redacting it again for every page.
  const redactedFiles = new Map<string, Promise<{ bytes: Buffer; cutAtLimit: boolean }>>();

  const loadRedacted = (path: string, size: number) => {
    const cached = redactedFiles.get(path);
    if (cached) return cached;
    const loading = (async () => {
      const [result] = await session.readFiles([
        { path, maxReadBytes: Math.min(size, RECORDER_FILE_MAX_BYTES) },
      ]);
      if (!result?.success) throw new Error(`${path} could not be read.`);
      return {
        bytes: Buffer.from(redactor.redact(result.content.toString('utf8')), 'utf8'),
        cutAtLimit: size > RECORDER_FILE_MAX_BYTES,
      };
    })();
    redactedFiles.set(path, loading);
    // A failed read is not kept, so a later page can try again.
    loading.catch(() => redactedFiles.delete(path));
    return loading;
  };

  return {
    writeResults: async (files) => {
      if (files.length === 0) return;
      // A resolved call can still report that a path was not written, so each flag is checked.
      const made = await session.mkdirs([RECORDER_RESULTS_DIR]);
      if (!made.every(Boolean)) throw new Error(`Could not create ${RECORDER_RESULTS_DIR}.`);
      const written = await session.writeFiles(
        files.map(({ path, content }) => ({ path, content: Buffer.from(content, 'utf8') }))
      );
      const failed = files.filter((_, index) => !written[index]?.success).map(({ path }) => path);
      if (failed.length > 0) throw new Error(`Could not write ${failed.join(', ')}.`);
    },

    readFile: async ({ path: rawPath, offset, length }) => {
      const resolved = resolveWorkspacePath(rawPath);
      if (!resolved.ok) return `Error: ${resolved.reason}`;
      const { path } = resolved;

      const [stat] = await session.statFiles([path]);
      if (!stat?.exists) return `Error: ${path} does not exist.`;
      if (stat.is_dir) return `Error: ${path} is a directory, not a file.`;

      // The file is read and redacted whole, then paged. Redacting a page on its own would miss a
      // secret that crosses the page boundary, and two reads could put its halves together.
      let loaded: { bytes: Buffer; cutAtLimit: boolean };
      try {
        loaded = await loadRedacted(path, stat.size);
      } catch {
        return `Error: ${path} could not be read.`;
      }
      const { bytes: redacted, cutAtLimit } = loaded;
      const readable = cutAtLimit
        ? redacted.subarray(0, Math.max(0, redacted.length - RECORDER_REDACTION_MARGIN_BYTES))
        : redacted;

      // Offsets count bytes of the redacted text, which is what the model is shown.
      const start = toInt(offset, 0, 0, Number.MAX_SAFE_INTEGER);
      const count = toInt(length, RECORDER_READ_DEFAULT_BYTES, 1, RECORDER_READ_MAX_BYTES);
      const slice = readable.subarray(start, start + count);
      const end = start + slice.length;
      const more =
        end < readable.length
          ? `\n[bytes ${start}-${end} of ${readable.length}; read on with offset ${end}]`
          : cutAtLimit
          ? `\n[bytes ${start}-${end}; the file is longer than can be read]`
          : '';
      return `${slice.toString('utf8')}${more}`;
    },
  };
};
