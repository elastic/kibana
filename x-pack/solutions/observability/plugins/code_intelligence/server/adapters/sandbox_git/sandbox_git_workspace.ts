/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RunCommandParams, RunCommandResult } from '@kbn/sandbox-plugin/server';

import type { GitCommandFailure } from './sandbox_git_helpers';
import type { GitCredentialsProvider, GitRemote } from './git_credentials_provider';
import {
  FIXED_GIT_ENV,
  PROBE_FAILED_EXIT,
  REMOVE_SCRIPT,
  RESTORE_SCRIPT,
} from './sandbox_git_scripts';

/** The part of `SandboxSession` the adapters use; `isReset` is deliberately ignored. */
export interface SandboxCommandRunner {
  runCommand(params: RunCommandParams): Promise<RunCommandResult>;
}

/** Pod-local scratch root. Never `/workspace`: that tree is snapshotted after every mutating call. */
export const SANDBOX_GIT_ROOT = '/tmp/code-intelligence';

/** Explicit per-command limits; the service default (600 seconds) is a demo value. */
export const SANDBOX_GIT_TIMEOUTS = {
  cloneSeconds: 600,
  scanSeconds: 60,
  blobSeconds: 120,
  chunkSeconds: 60,
  cleanupSeconds: 60,
} as const;

const GRPC_UNAVAILABLE = 14;
const GRPC_RESOURCE_EXHAUSTED = 8;

/** A command result, or why one command attempt did not produce a usable result. */
export type SandboxCommandOutcome =
  | { readonly kind: 'result'; readonly result: RunCommandResult }
  | { readonly kind: 'lost'; readonly reason: 'unavailable' | 'timed_out' | 'probe_failed' }
  | { readonly kind: 'failure'; readonly failure: GitCommandFailure };

export interface SandboxGitWorkspaceOptions {
  readonly session: SandboxCommandRunner;
  readonly repositories: readonly GitRemote[];
  readonly credentials: GitCredentialsProvider;
  readonly logger?: Logger;
  readonly rootPath?: string;
  /** Value for `GIT_ALLOW_PROTOCOL`; only `https` in production. */
  readonly allowedProtocols?: string;
}

export interface PinnedRevision {
  readonly requestedRevision: string;
  readonly commitSha: string;
}

const grpcCode = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number'
    ? error.code
    : undefined;

/**
 * Owns the Git clones of one extraction batch inside one sandbox session. Every repository
 * command is prefixed by a probe; when the probe fails, the call hits gRPC `UNAVAILABLE`, or it
 * times out, the clone is rebuilt at the pinned commit and the command is retried once.
 */
export class SandboxGitWorkspace {
  public readonly rootPath: string;
  private readonly remotes: ReadonlyMap<string, GitRemote>;
  private readonly pins = new Map<string, PinnedRevision>();
  private readonly restores = new Map<string, Promise<GitCommandFailure | undefined>>();
  /** Counts completed or started restores per repository, so a command that raced one retries instead of restoring again. */
  private readonly restoreGenerations = new Map<string, number>();
  private used = false;

  constructor(private readonly options: SandboxGitWorkspaceOptions) {
    this.rootPath = options.rootPath ?? SANDBOX_GIT_ROOT;
    if (!this.rootPath.startsWith('/') || this.rootPath.endsWith('/'))
      throw new Error('Sandbox Git root path must be absolute without a trailing slash.');
    this.remotes = new Map(options.repositories.map((remote) => [remote.repository, remote]));
  }

  public remote(repository: string): GitRemote | undefined {
    return this.remotes.get(repository);
  }

  /** Names the clone of one repository; identities contain no `/` after replacement. */
  public repositoryPath(repository: string): string {
    return `${this.rootPath}/${repository.replace('/', '__')}.git`;
  }

  public get spoolDirectory(): string {
    return `${this.rootPath}/spool`;
  }

  public pinned(repository: string): PinnedRevision | undefined {
    return this.pins.get(repository);
  }

  public pin(repository: string, pin: PinnedRevision): void {
    this.pins.set(repository, pin);
  }

  public async credentialsFor(repository: string): Promise<Record<string, string>> {
    const remote = this.remotes.get(repository);
    return remote === undefined ? {} : this.options.credentials.envFor(remote);
  }

  /** Runs one command and converts transport errors into typed outcomes. Never rejects. */
  public async run(params: {
    readonly command: string;
    readonly env: Readonly<Record<string, string>>;
    readonly timeoutSeconds: number;
  }): Promise<SandboxCommandOutcome> {
    this.used = true;
    try {
      const result = await this.options.session.runCommand({
        command: params.command,
        env: {
          ...FIXED_GIT_ENV,
          GIT_ALLOW_PROTOCOL: this.options.allowedProtocols ?? 'https',
          ...params.env,
        },
        timeout_seconds: params.timeoutSeconds,
      });
      return result.timed_out ? { kind: 'lost', reason: 'timed_out' } : { kind: 'result', result };
    } catch (error: unknown) {
      const code = grpcCode(error);
      if (code === GRPC_UNAVAILABLE) return { kind: 'lost', reason: 'unavailable' };
      if (code === GRPC_RESOURCE_EXHAUSTED)
        return {
          kind: 'failure',
          failure: {
            code: 'sandbox_output_limit_exceeded',
            message: 'Sandbox command output exceeded the transport limit.',
            retryable: false,
          },
        };
      return {
        kind: 'failure',
        failure: {
          code: 'sandbox_command_failed',
          message: 'Sandbox command could not be run.',
          retryable: true,
        },
      };
    }
  }

  /**
   * Runs a probed script against one repository's clone at its pinned commit. Returns the command
   * result (with any exit code other than the probe failure) or a typed failure.
   */
  public async runInRepository(
    repository: string,
    commitSha: string,
    params: {
      readonly command: string;
      readonly env: Readonly<Record<string, string>>;
      readonly timeoutSeconds: number;
    }
  ): Promise<RunCommandResult | GitCommandFailure> {
    const remote = this.remotes.get(repository);
    if (remote === undefined)
      return {
        code: 'repository_not_configured',
        message: 'Repository is not configured for sandbox access.',
        retryable: false,
      };
    const env = {
      ...params.env,
      CI_REPO: this.repositoryPath(repository),
      CI_REMOTE: remote.remoteUrl,
      CI_SHA: commitSha,
    };
    for (let attempt = 0; ; attempt++) {
      const generation = this.restoreGenerations.get(repository) ?? 0;
      const outcome = await this.run({ ...params, env });
      if (outcome.kind === 'failure') return outcome.failure;
      const lost =
        outcome.kind === 'lost'
          ? outcome.reason
          : outcome.result.exit_code === PROBE_FAILED_EXIT
          ? 'probe_failed'
          : undefined;
      if (lost === undefined && outcome.kind === 'result') return outcome.result;
      if (attempt > 0)
        return lost === 'timed_out'
          ? { code: 'git_timeout', message: 'Git command timed out.', retryable: true }
          : {
              code: 'repository_unavailable',
              message: 'Sandbox repository clone could not be restored.',
              retryable: true,
            };
      this.options.logger?.debug(
        `Restoring sandbox clone of ${repository} at ${commitSha} after ${lost}.`
      );
      const restored =
        (this.restoreGenerations.get(repository) ?? 0) !== generation
          ? await this.restores.get(repository)
          : await this.restore(repository, commitSha);
      if (restored !== undefined) return restored;
    }
  }

  /** Rebuilds one clone at its pinned commit; concurrent callers share the same rebuild. */
  private restore(repository: string, commitSha: string): Promise<GitCommandFailure | undefined> {
    const inFlight = this.restores.get(repository);
    if (inFlight !== undefined) return inFlight;
    this.restoreGenerations.set(repository, (this.restoreGenerations.get(repository) ?? 0) + 1);
    const restoring = (async (): Promise<GitCommandFailure | undefined> => {
      const remote = this.remotes.get(repository);
      if (remote === undefined)
        return {
          code: 'repository_not_configured',
          message: 'Repository is not configured for sandbox access.',
          retryable: false,
        };
      const env = {
        ...(await this.options.credentials.envFor(remote)),
        CI_ROOT: this.rootPath,
        CI_REPO: this.repositoryPath(repository),
        CI_REMOTE: remote.remoteUrl,
        CI_SHA: commitSha,
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        const outcome = await this.run({
          command: RESTORE_SCRIPT,
          env,
          timeoutSeconds: SANDBOX_GIT_TIMEOUTS.cloneSeconds,
        });
        if (outcome.kind === 'failure') return outcome.failure;
        if (outcome.kind === 'result' && outcome.result.exit_code === 0) return undefined;
        if (outcome.kind === 'result' && outcome.result.exit_code !== PROBE_FAILED_EXIT) break;
      }
      return {
        code: 'repository_unavailable',
        message: 'Sandbox repository clone could not be restored.',
        retryable: true,
      };
    })().finally(() => this.restores.delete(repository));
    this.restores.set(repository, restoring);
    return restoring;
  }

  /** Deletes one adapter-owned path in the pod; failures are ignored because the pod is disposable. */
  public async remove(path: string): Promise<void> {
    if (!this.used || (path !== this.rootPath && !path.startsWith(`${this.rootPath}/`))) return;
    await this.run({
      command: REMOVE_SCRIPT,
      env: { CI_TARGET: path },
      timeoutSeconds: SANDBOX_GIT_TIMEOUTS.cleanupSeconds,
    });
  }

  /** Deletes one repository's clone and forgets its pinned commit, so peak pod disk stays at 1 clone. */
  public async releaseRepository(repository: string): Promise<void> {
    this.pins.delete(repository);
    await this.remove(this.repositoryPath(repository));
  }

  /** Deletes everything the batch wrote under the root; a batch that never ran a command allocates no pod. */
  public async close(): Promise<void> {
    this.pins.clear();
    await this.remove(this.rootPath);
  }
}
