/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { BATCH_SIZE } from '../constants';
import { createGitClient, createSshGitClient } from '../git/protocol';
import type { GitClient, GitFile } from '../git/protocol';
import { parseSshUrl } from '../git/ssh_transport';
import type { LibraryVersionRef, RuleKey, RuleLibraryAttributes, RuleLibraryItem } from '../types';
import { findHighest } from '../versions';
import { parseItem } from './parse_item';
import type { ItemBatch, ProviderDeps, RuleLibraryProvider } from './types';

const DEFAULT_BRANCH = 'main';

// Rule files live in a folder under rules/; the package files at the root of rules/ are skipped.
const isLibraryFile = (path: string): boolean =>
  path.startsWith('rules/') &&
  path.indexOf('/', 'rules/'.length) !== -1 &&
  (path.endsWith('.json') || path.endsWith('.yml') || path.endsWith('.yaml'));

const buildClient = ({ provider, secret }: RuleLibraryAttributes): GitClient => {
  const { url, authType = 'none', username, known_hosts: knownHosts } = provider;
  if (!url) throw new Error('Git provider requires a url');
  if (authType === 's3_access_key') {
    throw new Error(`Git provider does not support auth type "${authType}"`);
  }

  const sshTarget = /^https?:\/\//.test(url) ? null : parseSshUrl(url);
  if (sshTarget || authType === 'ssh_key') {
    if (!sshTarget) throw new Error('Auth type "ssh_key" requires an SSH repository url');
    if (authType !== 'ssh_key') throw new Error('SSH repository urls require auth type "ssh_key"');
    if (!secret) throw new Error('Auth type "ssh_key" requires a secret (the private key)');
    // TODO: should known hosts be required? If so, throw here, before connecting, not in verifyHostKey.
    return createSshGitClient({
      target: { ...sshTarget, user: username ?? sshTarget.user },
      privateKey: secret,
      knownHosts: knownHosts ?? '',
    });
  }

  const headers: Record<string, string> = {};
  if (authType === 'token' || authType === 'basic') {
    if (!secret) throw new Error(`Auth type "${authType}" requires a secret`);
    const credentials = `${username ?? 'x-access-token'}:${secret}`;
    headers.Authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }
  return createGitClient({ url, headers });
};

const withClient = async <T>(client: GitClient, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } finally {
    await client.close();
  }
};

export class GitProvider implements RuleLibraryProvider {
  private readonly logger: Logger;

  constructor({ logger }: ProviderDeps) {
    this.logger = logger;
  }

  async resolveVersion(
    library: RuleLibraryAttributes,
    opts?: { pinned?: string }
  ): Promise<LibraryVersionRef> {
    const client = buildClient(library);
    const branch = library.provider.branch ?? DEFAULT_BRANCH;
    const prefix = `refs/tags/${branch}/v`;
    const tags = await withClient(client, async () => {
      await client.getCapabilities();
      return client.listRefs([prefix]);
    });
    const versions = tags.map(({ name }) => name.slice(prefix.length));
    const version = opts?.pinned ?? findHighest(versions);
    if (!version) throw new Error(`No release tags under ${prefix}`);
    const tag = tags.find(({ name }) => name === `${prefix}${version}`);
    if (!tag) throw new Error(`Tag ${prefix}${version} not found`);
    return { version, ref: tag.sha };
  }

  async readLatestItems(
    library: RuleLibraryAttributes,
    ref: LibraryVersionRef,
    onBatch: ItemBatch
  ): Promise<void> {
    await this.walk(library, ref, onBatch, () => true);
  }

  async readSpecificItems(
    library: RuleLibraryAttributes,
    pairs: RuleKey[],
    ref: LibraryVersionRef,
    onBatch: ItemBatch
  ): Promise<RuleKey[]> {
    const missing = new Map(pairs.map((pair) => [`${pair.rule_id}_${pair.version}`, pair]));
    await this.walk(library, ref, onBatch, (item) =>
      missing.delete(`${item.rule_id}_${item.version}`)
    );
    return [...missing.values()];
  }

  private async walk(
    library: RuleLibraryAttributes,
    { version, ref }: LibraryVersionRef,
    onBatch: ItemBatch,
    keep: (item: RuleLibraryItem) => boolean
  ): Promise<void> {
    if (typeof ref !== 'string') throw new Error('Git provider needs a commit sha as ref');
    const client = buildClient(library);
    await withClient(client, async () => {
      const files = await client.listFiles(ref, isLibraryFile);
      this.logger.debug(`Listed ${files.length} rule files at ${version} (${ref})`);

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch: GitFile[] = files.slice(i, i + BATCH_SIZE);
        const blobs = await client.fetchBlobs(batch.map(({ blobId }) => blobId));
        const items = batch
          .map(({ path, blobId }) => {
            const blob = blobs.get(blobId);
            if (!blob) throw new Error(`Blob ${blobId} (${path}) missing from server reply`);
            return parseItem(path, blob);
          })
          .filter(keep);
        if (items.length) await onBatch(items);
      }
    });
  }
}
