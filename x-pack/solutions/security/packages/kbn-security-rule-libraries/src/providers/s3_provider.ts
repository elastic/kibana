/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { BATCH_SIZE } from '../constants';
import type { LibraryVersionRef, RuleKey, RuleLibraryAttributes, RuleLibraryItem } from '../types';
import { findHighest } from '../versions';
import { parseItem } from './parse_item';
import { S3Client } from './s3_client';
import type { ItemBatch, ProviderDeps, RuleLibraryProvider } from './types';

const DEFAULT_BRANCH = 'main';
const CONCURRENCY = 10;

const isLibraryKey = (key: string, root: string): boolean =>
  key.startsWith(`${root}rules/`) &&
  key.indexOf('/', `${root}rules/`.length) !== -1 &&
  key.endsWith('.json');

export class S3Provider implements RuleLibraryProvider {
  private readonly logger: Logger;

  constructor({ logger }: ProviderDeps) {
    this.logger = logger;
  }

  async resolveVersion(
    library: RuleLibraryAttributes,
    opts?: { pinned?: string }
  ): Promise<LibraryVersionRef> {
    if (opts?.pinned) return { version: opts.pinned };
    const branch = library.provider.branch ?? DEFAULT_BRANCH;
    const prefix = `${branch}/v`;
    const { prefixes } = await new S3Client(library).list(prefix, '/');
    const version = findHighest(
      prefixes.map((name) => name.slice(prefix.length).replace(/\/$/, ''))
    );
    if (!version) throw new Error(`No release versions under ${prefix}`);
    return { version };
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
    { version }: LibraryVersionRef,
    onBatch: ItemBatch,
    keep: (item: RuleLibraryItem) => boolean
  ): Promise<void> {
    const client = new S3Client(library);
    const root = `${library.provider.branch ?? DEFAULT_BRANCH}/v${version}/`;
    const { keys } = await client.list(root);
    const files = keys.filter((key) => isLibraryKey(key, root));
    this.logger.debug(`Listed ${files.length} rule files under ${root}`);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const items: RuleLibraryItem[] = [];
      for (let j = 0; j < batch.length; j += CONCURRENCY) {
        const chunk = await Promise.all(
          batch
            .slice(j, j + CONCURRENCY)
            .map(async (key) => parseItem(key, await client.object(key)))
        );
        items.push(...chunk.filter(keep));
      }
      if (items.length) await onBatch(items);
    }
  }
}
