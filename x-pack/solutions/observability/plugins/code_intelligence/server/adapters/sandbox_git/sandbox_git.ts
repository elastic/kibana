/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';

import {
  SourceUnavailableError,
  type SourceSession,
  type SourceSessionFactory,
} from '../../source_session';
import type { GitCredentialsProvider } from './git_credentials_provider';
import { SandboxGitRepositoryResolver } from './sandbox_git_repository_resolver';
import { SandboxGitSourceReader } from './sandbox_git_source_reader';
import { SandboxGitWorkspace, type SandboxCommandRunner } from './sandbox_git_workspace';

export { ConfigGitCredentialsProvider } from './git_credentials_provider';
export type { GitCredentialsProvider, GitRemote } from './git_credentials_provider';
export { SandboxGitRepositoryResolver } from './sandbox_git_repository_resolver';
export { SandboxGitSourceReader } from './sandbox_git_source_reader';
export { SandboxGitWorkspace } from './sandbox_git_workspace';
export type { SandboxCommandRunner } from './sandbox_git_workspace';

/** Names the sandbox session shared by every repository of one batch. */
export const batchSessionId = (batchId: string): string => `code-intelligence__${batchId}`;

/** Wires one workspace, resolver, and reader over an already-obtained sandbox session. */
export const createSandboxGitSourceSession = (options: {
  readonly session: SandboxCommandRunner;
  readonly repositories: ConstructorParameters<typeof SandboxGitWorkspace>[0]['repositories'];
  readonly credentials: GitCredentialsProvider;
  readonly cursorSecret: string;
  readonly logger?: Logger;
  readonly rootPath?: string;
  readonly allowedProtocols?: string;
  readonly readerLimits?: Omit<
    ConstructorParameters<typeof SandboxGitSourceReader>[0],
    'workspace' | 'cursorSecret'
  >;
}): SourceSession => {
  const workspace = new SandboxGitWorkspace(options);
  const reader = new SandboxGitSourceReader({
    ...options.readerLimits,
    workspace,
    cursorSecret: options.cursorSecret,
  });
  return {
    reader,
    repositoryResolver: new SandboxGitRepositoryResolver(workspace),
    finishRepository: async (repository) => {
      await reader.releaseRepository(repository);
      await workspace.releaseRepository(repository);
    },
    close: async () => {
      reader.close();
      await workspace.close();
    },
  };
};

/** Builds a factory that opens 1 sandbox session per batch through the Kibana `sandbox` plugin. */
export const sandboxGitSourceSessionFactory = ({
  sandbox,
  credentials,
  cursorSecret,
  logger,
}: {
  readonly sandbox: SandboxPluginStart;
  readonly credentials: GitCredentialsProvider;
  readonly cursorSecret: string;
  readonly logger: Logger;
}): SourceSessionFactory => {
  return ({ batchId, request, repositories }) => {
    let session: SandboxCommandRunner;
    try {
      session = sandbox.getSession(request, batchSessionId(batchId));
    } catch (error: unknown) {
      throw new SourceUnavailableError(
        error instanceof Error ? error.message : 'Sandbox is not configured in this deployment.'
      );
    }
    return createSandboxGitSourceSession({
      session,
      repositories,
      credentials,
      cursorSecret,
      logger,
    });
  };
};
