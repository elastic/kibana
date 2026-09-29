/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/Either';

import { repositoryRevisionRequestRt } from '../../domain';
import type {
  OperationResult,
  RepositoryResolver,
  RepositoryRevisionRequest,
  ResolvedRepository,
} from '../../domain';
import { LocalBareGitConfiguration } from './local_bare_git_configuration';
import type { LocalBareGitOptions } from './local_bare_git_helpers';
import {
  commandFailure,
  failure,
  isGitCommandFailure,
  isSafeRevision,
  isUnavailableCommit,
  runGit,
  verifyBareRepository,
} from './local_bare_git_helpers';

/** Resolves configured branches, tags, and immutable SHAs. */
export class LocalBareGitRepositoryResolver implements RepositoryResolver {
  private readonly configuration: LocalBareGitConfiguration;

  /** Binds resolution to explicit local mappings. */
  public constructor(options: LocalBareGitOptions) {
    this.configuration = new LocalBareGitConfiguration(options);
  }

  /** Refreshes trusted refs then resolves one immutable commit SHA. */
  public async resolve(
    request: RepositoryRevisionRequest
  ): Promise<OperationResult<ResolvedRepository>> {
    try {
      if (isLeft(repositoryRevisionRequestRt.decode(request)) || !isSafeRevision(request.revision))
        return failure('invalid_repository_revision', 'Repository revision is invalid.', false);
      /** Selects only configuration-owned storage. */
      const mapping = this.configuration.repositories.get(request.repository);
      if (mapping === undefined)
        return failure(
          'repository_not_configured',
          'Repository is not configured for local access.',
          false
        );
      /** Validates disk state for every acquisition. */
      const verified = await verifyBareRepository(this.configuration, mapping);
      if (verified !== true) return commandFailure(verified);
      /** Refreshes only the configured remote's heads and tags. */
      const fetched = await runGit(
        mapping.bareRepositoryPath,
        [
          'fetch',
          '--no-write-fetch-head',
          '--no-recurse-submodules',
          '--no-tags',
          '--prune',
          mapping.remoteName,
          `+refs/heads/*:refs/code-intelligence/${mapping.remoteName}/heads/*`,
          `+refs/tags/*:refs/code-intelligence/${mapping.remoteName}/tags/*`,
        ],
        this.configuration.commandTimeoutMs,
        64 * 1024
      );
      if (isGitCommandFailure(fetched)) return commandFailure(fetched);
      /** Proves a raw SHA names a commit before checking that commit's remote-owned provenance. */
      const rawSha = /^[0-9a-f]{40,64}$/i.test(request.revision);
      /** Names the private fetched-ref namespace used for provenance checks. */
      const ownedRefPrefix = `refs/code-intelligence/${mapping.remoteName}`;
      if (rawSha) {
        /** Resolves the requested raw object as a commit before provenance checks. */
        const commit = await runGit(
          mapping.bareRepositoryPath,
          ['rev-parse', '--verify', '--end-of-options', `${request.revision}^{commit}`],
          this.configuration.commandTimeoutMs,
          128
        );
        if (isGitCommandFailure(commit)) {
          if (isUnavailableCommit(commit))
            return failure(
              'revision_not_found',
              'Requested repository revision is unavailable.',
              false
            );
          return commandFailure(commit);
        }
        /** Proves a raw commit is reachable from the complete fetched owned-ref namespace in one query. */
        const unreachable = await runGit(
          mapping.bareRepositoryPath,
          [
            'rev-list',
            '--max-count=1',
            request.revision,
            '--not',
            `--glob=${ownedRefPrefix}/heads/*`,
            `--glob=${ownedRefPrefix}/tags/*`,
          ],
          this.configuration.commandTimeoutMs,
          128
        );
        if (isGitCommandFailure(unreachable)) return commandFailure(unreachable);
        if (unreachable.length !== 0)
          return failure(
            'revision_not_found',
            'Requested repository revision is unavailable.',
            false
          );
      }
      /** Selects no local-head fallback candidates. */
      const candidates = rawSha
        ? [request.revision]
        : request.revision.startsWith('refs/heads/')
        ? [`${ownedRefPrefix}/heads/${request.revision.slice('refs/heads/'.length)}`]
        : request.revision.startsWith('refs/tags/')
        ? [`${ownedRefPrefix}/tags/${request.revision.slice('refs/tags/'.length)}`]
        : [
            `${ownedRefPrefix}/tags/${request.revision}`,
            `${ownedRefPrefix}/heads/${request.revision}`,
          ];
      for (const candidate of candidates) {
        /** Proves named candidates exist before resolution; raw SHA ancestry was proven above. */
        const exists = rawSha
          ? Buffer.alloc(0)
          : await runGit(
              mapping.bareRepositoryPath,
              ['show-ref', '--verify', '--quiet', candidate],
              this.configuration.commandTimeoutMs,
              128
            );
        if (isGitCommandFailure(exists)) {
          if (exists.code === 'git_nonzero_exit' && exists.exitCode === 1) continue;
          return commandFailure(exists);
        }
        /** Converts the pre-proven ref to its immutable commit object. */
        const resolved = await runGit(
          mapping.bareRepositoryPath,
          ['rev-parse', '--verify', '--end-of-options', `${candidate}^{commit}`],
          this.configuration.commandTimeoutMs,
          128
        );
        if (isGitCommandFailure(resolved)) {
          if (isUnavailableCommit(resolved))
            return failure(
              'revision_not_found',
              'Requested repository revision is unavailable.',
              false
            );
          return commandFailure(resolved);
        }
        /** Checks Git output before returning it through the domain port. */
        const commitSha = resolved.toString('utf8').trim();
        if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(commitSha))
          return {
            status: 'success',
            value: {
              commitSha,
              repository: request.repository,
              requestedRevision: request.revision,
            },
          };
      }
      return failure('revision_not_found', 'Requested repository revision is unavailable.', false);
    } catch (_error: unknown) {
      return failure('local_git_operational_failure', 'Local Git operation failed.', true);
    }
  }
}
