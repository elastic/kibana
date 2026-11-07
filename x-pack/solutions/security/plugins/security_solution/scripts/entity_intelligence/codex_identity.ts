/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodexLocalOwner } from './codex_session_types';
import { codexHash } from './codex_session_parser';

/** Identifies the current local account only when it owns the observed source file. */
export const createCodexLocalOwner = (
  account: { uid: number; username: string },
  sourceUid: number,
  hashSalt: string
): CodexLocalOwner | undefined => {
  if (
    !Number.isSafeInteger(account.uid) ||
    account.uid < 0 ||
    account.uid !== sourceUid ||
    !/^[\p{L}\p{N}_.@-]{1,128}$/u.test(account.username)
  ) {
    return undefined;
  }
  return {
    id: `local-os:${codexHash(hashSalt, `local-owner:${account.uid}`)}`,
    name: account.username,
    provenance: 'local_os_account',
  };
};
