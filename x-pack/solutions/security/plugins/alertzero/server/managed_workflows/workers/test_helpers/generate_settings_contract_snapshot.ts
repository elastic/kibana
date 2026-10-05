/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { readTestHelperFileAt, resolveBaseCommit } from './merge_base';
import {
  SETTINGS_CONTRACT_SNAPSHOT_FILE,
  buildWorkerSettingsContracts,
  nextSettingsContractSnapshot,
  parseAcceptedIssue,
  parseSettingsContractSnapshot,
  type SettingsContractSnapshot,
} from './settings_contract';

const readBaseSnapshot = (): SettingsContractSnapshot | undefined => {
  const commit = resolveBaseCommit();
  const text =
    commit === undefined
      ? undefined
      : readTestHelperFileAt(commit, SETTINGS_CONTRACT_SNAPSHOT_FILE);
  return text === undefined ? undefined : parseSettingsContractSnapshot(text);
};

/** The next settings contract snapshot and where it goes. */
export const generateSettingsContractSnapshot = (
  argv: readonly string[]
): { destination: string; contents: string } => {
  const destination = resolve(__dirname, SETTINGS_CONTRACT_SNAPSHOT_FILE);
  const acceptedIssue = parseAcceptedIssue(argv);
  const committed: SettingsContractSnapshot = existsSync(destination)
    ? parseSettingsContractSnapshot(readFileSync(destination, 'utf8'))
    : { acceptedBreakingChanges: [], workers: {} };
  const snapshot = nextSettingsContractSnapshot({
    committed,
    current: buildWorkerSettingsContracts(),
    base: readBaseSnapshot(),
    acceptedIssue,
  });
  return { destination, contents: `${JSON.stringify(snapshot, null, 2)}\n` };
};
