/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { LocalBareGitOptions, LocalBareRepositoryMapping } from './local_bare_git_helpers';
import {
  LOCAL_GIT_COMMAND_TIMEOUT_MS,
  LOCAL_GIT_MAX_ACTIVE_SPOOLS,
  LOCAL_GIT_MAX_SPOOL_BYTES,
  LOCAL_GIT_MAX_SPOOL_CONCURRENCY,
  LOCAL_GIT_MAX_TOTAL_SPOOL_BYTES,
  LOCAL_GIT_PAGE_SIZE,
  LOCAL_GIT_SPOOL_SLOT_WAIT_MS,
  LOCAL_GIT_SPOOL_TTL_MS,
  containsControlCharacter,
} from './local_bare_git_helpers';

const SPOOL_ROOT_NAME = 'code-intelligence-git-spool-v1';
const MAX_TIMER_DELAY_MS = 2_147_483_647;

/** Holds validated adapter policy and trusted repository mappings. */
export class LocalBareGitConfiguration {
  public readonly repositories: ReadonlyMap<string, LocalBareRepositoryMapping>;
  public readonly cursorSecret: string;
  public readonly pageSize: number;
  public readonly commandTimeoutMs: number;
  public readonly maxSpoolBytes: number;
  public readonly maxTotalSpoolBytes: number;
  public readonly maxSpoolConcurrency: number;
  public readonly spoolSlotWaitMs: number;
  public readonly maxActiveSpools: number;
  public readonly spoolTtlMs: number;
  public readonly spoolRootPath: string;

  /** Validates static configuration before filesystem or Git I/O. */
  public constructor(options: LocalBareGitOptions) {
    if (options.cursorSecret.length < 16)
      throw new Error('Local Git cursor secret must be at least 16 characters.');
    if (options.repositories.length === 0)
      throw new Error('Local Git requires at least one repository mapping.');
    /** Indexes unique visible identities. */
    const mappings = new Map(options.repositories.map((mapping) => [mapping.repository, mapping]));
    if (mappings.size !== options.repositories.length)
      throw new Error('Local Git repository mappings must be unique.');
    for (const mapping of options.repositories) {
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(mapping.repository))
        throw new Error('Local Git repository mapping identity is invalid.');
      if (!mapping.bareRepositoryPath.startsWith('/'))
        throw new Error('Local Git repository mapping path must be absolute.');
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(mapping.remoteName))
        throw new Error('Local Git remote name is invalid.');
      if (
        mapping.expectedRemoteUrl.length === 0 ||
        containsControlCharacter(mapping.expectedRemoteUrl)
      )
        throw new Error('Local Git expected remote URL is invalid.');
    }
    /** Applies hard response page bound. */
    this.pageSize = Math.min(options.pageSize ?? LOCAL_GIT_PAGE_SIZE, LOCAL_GIT_PAGE_SIZE);
    this.commandTimeoutMs = options.commandTimeoutMs ?? LOCAL_GIT_COMMAND_TIMEOUT_MS;
    this.maxSpoolBytes = options.maxSpoolBytes ?? LOCAL_GIT_MAX_SPOOL_BYTES;
    this.maxTotalSpoolBytes = options.maxTotalSpoolBytes ?? LOCAL_GIT_MAX_TOTAL_SPOOL_BYTES;
    this.maxSpoolConcurrency = options.maxSpoolConcurrency ?? LOCAL_GIT_MAX_SPOOL_CONCURRENCY;
    this.spoolSlotWaitMs = options.spoolSlotWaitMs ?? LOCAL_GIT_SPOOL_SLOT_WAIT_MS;
    this.maxActiveSpools = options.maxActiveSpools ?? LOCAL_GIT_MAX_ACTIVE_SPOOLS;
    this.spoolTtlMs = options.spoolTtlMs ?? LOCAL_GIT_SPOOL_TTL_MS;
    this.spoolRootPath = options.spoolRootPath ?? join(tmpdir(), SPOOL_ROOT_NAME);
    if (!this.spoolRootPath.startsWith('/'))
      throw new Error('Local Git spool root path must be absolute.');
    /** Validates all numerical resource controls together. */
    if (
      [
        this.pageSize,
        this.commandTimeoutMs,
        this.maxSpoolBytes,
        this.maxTotalSpoolBytes,
        this.maxSpoolConcurrency,
        this.spoolSlotWaitMs,
        this.maxActiveSpools,
        this.spoolTtlMs,
      ].some((value) => !Number.isSafeInteger(value) || value < 1) ||
      this.commandTimeoutMs > MAX_TIMER_DELAY_MS ||
      this.spoolSlotWaitMs > MAX_TIMER_DELAY_MS ||
      this.spoolTtlMs > MAX_TIMER_DELAY_MS ||
      this.maxSpoolBytes > this.maxTotalSpoolBytes
    )
      throw new Error('Local Git resource limits are invalid.');
    this.repositories = mappings;
    this.cursorSecret = options.cursorSecret;
  }
}
