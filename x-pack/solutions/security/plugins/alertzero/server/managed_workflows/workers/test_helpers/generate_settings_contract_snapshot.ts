/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BREAKING_CHANGE_EXITS,
  GENERATE_SETTINGS_CONTRACT_SNAPSHOT,
  PRE_CUSTOMER_RESET_FLAG,
  SETTINGS_CONTRACT_SNAPSHOT_FILE,
  breakingChanges,
  buildWorkerSettingsContracts,
  diffWorkerSettingsContracts,
  parseSettingsContractSnapshot,
  type SettingsContractSnapshot,
} from './settings_contract';

const ISSUE_URL = /^https:\/\/github\.com\/elastic\/[\w.-]+\/(issues|pull)\/\d+$/;

const readResetIssue = (argv: readonly string[]): string | undefined => {
  const index = argv.indexOf(PRE_CUSTOMER_RESET_FLAG);
  if (index === -1) {
    return undefined;
  }
  const url = argv[index + 1];
  if (url === undefined || !ISSUE_URL.test(url)) {
    throw new Error(
      `${PRE_CUSTOMER_RESET_FLAG} needs the GitHub issue where the reset was agreed, for example https://github.com/elastic/security-team/issues/12345`
    );
  }
  return url;
};

/**
 * The next settings contract snapshot and where it goes. A breaking change against the committed
 * snapshot is refused unless the reset flag names the issue where a pre-customer reset was agreed;
 * that URL is appended to the snapshot, so the decision is part of the reviewed diff.
 */
export const generateSettingsContractSnapshot = (
  argv: readonly string[]
): { destination: string; contents: string } => {
  const destination = resolve(__dirname, SETTINGS_CONTRACT_SNAPSHOT_FILE);
  const resetIssue = readResetIssue(argv);
  const committed: SettingsContractSnapshot = existsSync(destination)
    ? parseSettingsContractSnapshot(readFileSync(destination, 'utf8'))
    : { preCustomerResets: [], workers: {} };
  const workers = buildWorkerSettingsContracts();
  const breaking = breakingChanges(diffWorkerSettingsContracts(committed.workers, workers));

  if (breaking.length > 0 && resetIssue === undefined) {
    throw new Error(
      [
        'Refusing to update the snapshot: this change breaks stored Worker settings.',
        ...breaking.map((change) => `- ${change.text}`),
        '',
        `It needs ${BREAKING_CHANGE_EXITS}. For a reset, agree it on an issue and run:`,
        `${GENERATE_SETTINGS_CONTRACT_SNAPSHOT} ${PRE_CUSTOMER_RESET_FLAG} <issue-url>`,
      ].join('\n')
    );
  }
  if (breaking.length === 0 && resetIssue !== undefined) {
    throw new Error(
      `${PRE_CUSTOMER_RESET_FLAG} was passed, but nothing in this change breaks stored Worker settings.`
    );
  }

  const snapshot: SettingsContractSnapshot = {
    preCustomerResets: [
      ...committed.preCustomerResets,
      ...(resetIssue === undefined
        ? []
        : [{ issue: resetIssue, changes: breaking.map((change) => change.text) }]),
    ],
    workers,
  };
  return { destination, contents: `${JSON.stringify(snapshot, null, 2)}\n` };
};
