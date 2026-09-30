/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The remote a credential is requested for. */
export interface GitRemote {
  readonly repository: string;
  readonly remoteUrl: string;
  /** Reserved for connector-backed credentials. */
  readonly githubConnectorId?: string;
}

/**
 * Supplies the environment variables Git needs to authenticate to one remote.
 * The values are passed only as sandbox command environment, never in command text or URLs.
 */
export interface GitCredentialsProvider {
  /** Returns an empty record when the remote needs no credential. */
  envFor(remote: GitRemote): Promise<Record<string, string>>;
}

const GITHUB_ORIGIN = 'https://github.com';

/**
 * Sends a GitHub token as an HTTP `Authorization` header through Git's environment-only
 * configuration (`GIT_CONFIG_COUNT`), so nothing is written to the sandbox filesystem.
 */
export const githubTokenEnv = (token: string): Record<string, string> => ({
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: `http.${GITHUB_ORIGIN}/.extraheader`,
  GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString(
    'base64'
  )}`,
});

/** Interim provider that reads `xpack.code_intelligence.github.token` and applies it to github.com remotes only. */
export class ConfigGitCredentialsProvider implements GitCredentialsProvider {
  constructor(private readonly token: string | undefined) {}

  public async envFor({ remoteUrl }: GitRemote): Promise<Record<string, string>> {
    if (this.token === undefined) return {};
    const { origin } = new URL(remoteUrl);
    return origin === GITHUB_ORIGIN ? githubTokenEnv(this.token) : {};
  }
}
