/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';
import { getFlattenedObject } from '@kbn/std';
import { MANAGED_BLOCK_END, MANAGED_BLOCK_START } from './constants';
import type { SandboxConnection } from './secrets';

type SettingValue = string | number | boolean;

const SANDBOX_API_KEY_SETTING = 'xpack.sandbox.api_key';

/** The settings a local Kibana needs to run Nightshift investigations in the eval sandbox. */
export const getLocalDevSettings = ({
  host,
  port,
  apiKey,
}: SandboxConnection): Record<string, SettingValue> => ({
  // Nightshift itself: the feature flag gates the app and every investigation route.
  'feature_flags.overrides.nightshift.enabled': true,
  'xpack.nightshift_investigations.enabled': true,
  'xpack.agenticInvestigations.enabled': true,
  'xpack.proposals.enabled': true,
  // Investigations only run as the Nightshift service account.
  'xpack.security.serviceAccounts.enabled': true,
  'xpack.sandbox.enabled': true,
  'xpack.sandbox.host': host,
  'xpack.sandbox.port': port,
  [SANDBOX_API_KEY_SETTING]: apiKey,
});

/** Splits a kibana.yml into the managed block and the rest of the file. */
export const splitManagedBlock = (
  content: string
): { before: string; block: string | undefined; after: string } => {
  const start = content.indexOf(MANAGED_BLOCK_START);
  if (start === -1) {
    if (content.includes(MANAGED_BLOCK_END)) {
      throw new Error(
        `Found "${MANAGED_BLOCK_END}" without its start marker; fix the file by hand`
      );
    }
    return { before: content, block: undefined, after: '' };
  }
  const end = content.indexOf(MANAGED_BLOCK_END, start);
  if (end === -1 || content.indexOf(MANAGED_BLOCK_START, start + 1) !== -1) {
    throw new Error(
      `Found an unterminated or repeated "${MANAGED_BLOCK_START}" block; fix the file by hand`
    );
  }
  const blockEnd = end + MANAGED_BLOCK_END.length;
  return {
    before: content.slice(0, start),
    block: content.slice(start, blockEnd),
    after: content.slice(blockEnd).replace(/^\n/, ''),
  };
};

/**
 * Settings as Kibana reads them, with nested and dotted keys flattened alike, so
 * `xpack.sandbox: { api_key }` and `xpack.sandbox.api_key` are the same setting.
 */
const readSettings = (yamlContent: string): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = parse(yamlContent);
  } catch {
    // Fixed message: the parser quotes the offending line, which can hold a secret.
    throw new Error('The Kibana config is not valid YAML; fix it and re-run');
  }
  return parsed && typeof parsed === 'object' ? getFlattenedObject(parsed) : {};
};

export interface PlannedBlock {
  /** The file with the managed block written in place, or appended. */
  content: string;
  /** Settings the file already sets to the same value elsewhere, left out of the block. */
  alreadySet: string[];
}

/**
 * Writes `settings` into the managed block of `content`, replacing an earlier block. A setting set
 * to the same value outside the block is left out; one set to another value stops the setup, since
 * YAML cannot hold the key twice and Kibana would silently pick one.
 */
export const planManagedBlock = (
  content: string,
  settings: Record<string, SettingValue>
): PlannedBlock => {
  const { before, block, after } = splitManagedBlock(content);
  const outside = readSettings(`${before}\n${after}`);

  const conflicts: string[] = [];
  const alreadySet: string[] = [];
  const managed: Record<string, SettingValue> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!(key in outside)) {
      managed[key] = value;
    } else if (outside[key] === value) {
      alreadySet.push(key);
    } else {
      conflicts.push(key);
    }
  }
  if (conflicts.length > 0) {
    throw new Error(
      [
        'These settings are already set outside the managed block, to other values:',
        ...conflicts.map((key) => `  ${key}`),
        'Remove them from the Kibana config (or comment them out) and re-run.',
      ].join('\n')
    );
  }

  const rendered = [
    MANAGED_BLOCK_START,
    '# Re-run setup_local_dev.js to refresh it, or run it with --remove to undo it.',
    stringify(managed).trimEnd(),
    MANAGED_BLOCK_END,
  ].join('\n');

  // A new block is set apart from the file by a blank line; a replaced one keeps its place.
  const head =
    block || before.length === 0 || before.endsWith('\n\n')
      ? before
      : `${before.replace(/\n?$/, '\n')}\n`;
  return {
    content: `${head}${rendered}\n${after}`,
    alreadySet,
  };
};

/** Removes the managed block and the blank line that set it apart. */
export const removeManagedBlock = (content: string): string => {
  const { before, block, after } = splitManagedBlock(content);
  if (!block) return content;
  return `${before.replace(/\n\n$/, '\n')}${after}`;
};

/** The managed block with its secrets replaced, for `--dry-run`. */
export const redactManagedBlock = (content: string): string => {
  const { block } = splitManagedBlock(content);
  return (block ?? '').replace(
    new RegExp(`^(${SANDBOX_API_KEY_SETTING}): .*$`, 'gm'),
    '$1: <redacted>'
  );
};
