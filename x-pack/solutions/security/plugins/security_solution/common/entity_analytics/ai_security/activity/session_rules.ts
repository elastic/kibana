/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LaunchMode, ProcessRecord, RunAlertRecord, RunStatus } from './types';

/** A descendant can outlive the agent process, so a run's window reaches a little past its last step. */
export const RUN_END_MARGIN_MS = 5 * 60_000;

/** Parent chains are followed at most this deep, which also stops on a cycle. */
export const MAX_PARENT_DEPTH = 100;

/** A root with no end event reads as running for this long, then as "no end event since". */
export const RUNNING_CAP_MS = 24 * 3_600_000;

/** Launch flags that turn permission prompts off, by product (Claude CLI docs, Cursor CLI docs). */
const PERMISSION_BYPASS_FLAGS: Readonly<Record<string, readonly string[]>> = {
  claude_code: ['--dangerously-skip-permissions', '--permission-mode=bypassPermissions'],
  cursor: ['--force', '--yolo'],
};

export const getLaunchMode = ({ entryMetaType, interactive }: ProcessRecord): LaunchMode => {
  if (entryMetaType === 'init') return 'scheduled';
  if (interactive === true) return 'interactive';
  if (entryMetaType) return 'scripted';
  return 'unknown';
};

const PRINT_FLAGS: readonly string[] = ['-p', '--print'];

/**
 * The prompt of a headless launch (`claude -p "<prompt>"`, `cursor-agent -p "<prompt>"`). Ordered
 * arguments are read first. Without them the command line is used, which has no quoting, so the
 * prompt is taken up to the next flag.
 */
export const parseHeadlessPrompt = (
  args: readonly string[] | undefined,
  commandLine: string | undefined
): { readonly isHeadless: boolean; readonly prompt?: string } => {
  if (args && args.length > 0) {
    const index = args.findIndex((arg) => PRINT_FLAGS.includes(arg));
    if (index >= 0) {
      const next = args[index + 1];
      return { isHeadless: true, prompt: next && !next.startsWith('-') ? next : undefined };
    }
    return { isHeadless: false };
  }
  if (!commandLine) return { isHeadless: false };
  const match = commandLine.match(/(?:^|\s)(?:-p|--print)(?:\s+(.*?))?(?=\s--?[a-zA-Z]|$)/);
  if (!match) return { isHeadless: false };
  const prompt = match[1]?.trim();
  return { isHeadless: true, prompt: prompt && !prompt.startsWith('-') ? prompt : undefined };
};

/**
 * The root was launched with permission prompts off. Sorted arguments lose the pairing of
 * `--permission-mode` with its value, so for those both arguments being present is enough.
 */
export const hasPermissionBypass = (agentName: string, root: ProcessRecord): boolean => {
  const flags = PERMISSION_BYPASS_FLAGS[agentName] ?? [];
  const isOrdered = !!root.args && root.args.length > 0;
  const isSorted = !isOrdered && root.unorderedArgs.length > 0;
  const tokens =
    (isOrdered ? root.args : isSorted ? root.unorderedArgs : root.commandLine?.split(/\s+/)) ?? [];
  const checksMode = flags.includes('--permission-mode=bypassPermissions');
  return tokens.some(
    (token, index) =>
      flags.includes(token) ||
      (checksMode &&
        token === '--permission-mode' &&
        (isSorted
          ? tokens.includes('bypassPermissions')
          : tokens[index + 1] === 'bypassPermissions'))
  );
};

/** Running or not, from the root's end event, calculated when the activity is read. */
export const getRunStatus = (
  root: ProcessRecord,
  endedProcessIds: ReadonlySet<string> | undefined,
  now: number
): RunStatus | undefined => {
  if (!endedProcessIds) return undefined;
  if (endedProcessIds.has(root.entityId)) return { kind: 'ended' };
  return now - new Date(root.timestamp).getTime() > RUNNING_CAP_MS
    ? { kind: 'stale', since: root.timestamp }
    : { kind: 'running' };
};

/** Alerts on a process of the run: the process itself, or a descendant of one by ancestry. */
export const getRunAlertIds = (
  processIds: ReadonlySet<string>,
  alerts: readonly RunAlertRecord[]
): string[] =>
  alerts
    .filter(
      ({ processEntityId, parentEntityId, ancestry }) =>
        (!!processEntityId && processIds.has(processEntityId)) ||
        (!!parentEntityId && processIds.has(parentEntityId)) ||
        ancestry.some((id) => processIds.has(id))
    )
    .map(({ id }) => id);

/** Finds the launch an agent process belongs to: its oldest ancestor that is also the agent's own. */
export const getOwnRootResolver = (
  own: ReadonlyMap<string, ProcessRecord>
): ((entityId: string) => string) => {
  return (entityId: string): string => {
    let current = entityId;
    for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
      const parent = own.get(current)?.parentEntityId;
      if (!parent || !own.has(parent) || parent === current) return current;
      current = parent;
    }
    return current;
  };
};
