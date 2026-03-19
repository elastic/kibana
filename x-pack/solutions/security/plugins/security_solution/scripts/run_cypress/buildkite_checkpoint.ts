/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile as _execFile } from 'child_process';
import { createHash } from 'crypto';
import path from 'path';

function execBuildkiteAgent(args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    _execFile('buildkite-agent', args, (error, stdout) => {
      if (error) reject(error);
      else resolve({ stdout });
    });
  });
}

export function isInBuildkite(): boolean {
  return Boolean(process.env.BUILDKITE);
}

const KIBANA_DIR_MARKER = `${path.sep}kibana${path.sep}`;

/**
 * Strips the agent-specific workspace prefix from absolute spec paths so that
 * the same spec file produces the same checkpoint key regardless of which
 * Buildkite agent runs the job. On retry the job may land on a different agent
 * whose workspace path differs (e.g. bk-agent-prod-gcp-<ID>).
 */
export const normalizeSpecPath = (specPath: string): string => {
  const idx = specPath.indexOf(KIBANA_DIR_MARKER);
  if (idx !== -1) {
    return specPath.substring(idx + KIBANA_DIR_MARKER.length);
  }
  return specPath;
};

/**
 * Builds a deterministic checkpoint key for a given spec file path.
 * Scoped to the Buildkite step and parallel job so checkpoints don't collide
 * across different CI workers or pipeline steps.
 */
export const getCheckpointKey = (specPath: string): string => {
  const stepId = process.env.BUILDKITE_STEP_ID || '';
  const job = process.env.BUILDKITE_PARALLEL_JOB || '0';
  const normalized = normalizeSpecPath(specPath);
  const hash = createHash('sha256').update(normalized).digest('hex').substring(0, 12);
  return `cy_ckpt_${stepId}_${job}_${hash}`;
};

export async function markSpecCompleted(specPath: string): Promise<void> {
  try {
    await execBuildkiteAgent(['meta-data', 'set', getCheckpointKey(specPath), 'done']);
  } catch {
    // Best-effort: ignore errors writing checkpoint
  }
}

export async function isSpecCompleted(specPath: string): Promise<boolean> {
  try {
    const { stdout } = await execBuildkiteAgent([
      'meta-data',
      'get',
      getCheckpointKey(specPath),
      '--default',
      '',
    ]);
    return stdout.trim() === 'done';
  } catch {
    return false;
  }
}
