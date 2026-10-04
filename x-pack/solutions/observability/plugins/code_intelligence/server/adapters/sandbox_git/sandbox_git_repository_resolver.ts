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
import { commandFailure, failure, isSafeRevision } from './sandbox_git_helpers';
import {
  CLONE_SETUP_FAILED_EXIT,
  REMOTE_UNAVAILABLE_EXIT,
  RESOLVE_SCRIPT,
  REVISION_NOT_FOUND_EXIT,
} from './sandbox_git_scripts';
import { SANDBOX_GIT_TIMEOUTS, type SandboxGitWorkspace } from './sandbox_git_workspace';

const COMMIT_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;

const revisionKind = (revision: string): 'head' | 'sha' | 'ref' | 'name' =>
  revision === 'HEAD'
    ? 'head'
    : COMMIT_SHA.test(revision)
    ? 'sha'
    : revision.startsWith('refs/heads/') || revision.startsWith('refs/tags/')
    ? 'ref'
    : 'name';

/**
 * Resolves a revision by shallow-cloning exactly that revision into the batch's sandbox session.
 * The fetched tip is the revision by construction, so no ref namespace or provenance walk is needed.
 * A repository resolves once per batch; later reads use the pinned commit.
 */
export class SandboxGitRepositoryResolver implements RepositoryResolver {
  constructor(private readonly workspace: SandboxGitWorkspace) {}

  public async resolve(
    request: RepositoryRevisionRequest
  ): Promise<OperationResult<ResolvedRepository>> {
    try {
      if (isLeft(repositoryRevisionRequestRt.decode(request)) || !isSafeRevision(request.revision))
        return failure('invalid_repository_revision', 'Repository revision is invalid.', false);
      if (this.workspace.remote(request.repository) === undefined)
        return failure(
          'repository_not_configured',
          'Repository is not configured for sandbox access.',
          false
        );
      const pinned = this.workspace.pinned(request.repository);
      if (pinned !== undefined) {
        return pinned.requestedRevision === request.revision
          ? {
              status: 'success',
              value: {
                commitSha: pinned.commitSha,
                repository: request.repository,
                requestedRevision: request.revision,
              },
            }
          : failure(
              'revision_already_pinned',
              'Repository is already pinned to another revision in this batch.',
              false
            );
      }
      const env = {
        ...(await this.workspace.credentialsFor(request.repository)),
        CI_ROOT: this.workspace.rootPath,
        CI_REPO: this.workspace.repositoryPath(request.repository),
        CI_REMOTE: this.workspace.remote(request.repository)?.remoteUrl ?? '',
        CI_KIND: revisionKind(request.revision),
        CI_REVISION: request.revision,
      };
      // Cloning from scratch is idempotent, so a lost pod or a timeout is retried once.
      for (let attempt = 0; attempt < 2; attempt++) {
        const outcome = await this.workspace.run({
          command: RESOLVE_SCRIPT,
          env,
          timeoutSeconds: SANDBOX_GIT_TIMEOUTS.cloneSeconds,
        });
        if (outcome.kind === 'failure') return commandFailure(outcome.failure);
        if (outcome.kind === 'lost') {
          if (attempt === 0) continue;
          return outcome.reason === 'timed_out'
            ? failure('git_timeout', 'Git command timed out.', true)
            : failure('sandbox_unavailable', 'Sandbox session is unavailable.', true);
        }
        const { exit_code: exitCode, stdout } = outcome.result;
        if (exitCode === REVISION_NOT_FOUND_EXIT)
          return failure(
            'revision_not_found',
            'Requested repository revision is unavailable.',
            false
          );
        if (exitCode === REMOTE_UNAVAILABLE_EXIT)
          return failure(
            'repository_unavailable',
            'Repository could not be read. Check its remote URL and the Git credentials.',
            false
          );
        if (exitCode === CLONE_SETUP_FAILED_EXIT)
          return failure('clone_setup_failed', 'Sandbox clone could not be created.', true);
        if (exitCode !== 0) return failure('git_nonzero_exit', 'Git command failed.', true);
        const commitSha = stdout.trim();
        if (
          !COMMIT_SHA.test(commitSha) ||
          (revisionKind(request.revision) === 'sha' &&
            commitSha.toLowerCase() !== request.revision.toLowerCase())
        )
          return failure(
            'revision_not_found',
            'Requested repository revision is unavailable.',
            false
          );
        this.workspace.pin(request.repository, { requestedRevision: request.revision, commitSha });
        return {
          status: 'success',
          value: { commitSha, repository: request.repository, requestedRevision: request.revision },
        };
      }
      return failure('sandbox_unavailable', 'Sandbox session is unavailable.', true);
    } catch (_error: unknown) {
      return failure('sandbox_git_operational_failure', 'Sandbox Git operation failed.', true);
    }
  }
}
