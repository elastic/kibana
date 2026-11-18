/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import { BATCH_SIZE } from '../constants';
import type { LibraryVersionRef, RuleKey, RuleLibraryItem } from '../types';
import { parseItem } from './parse_item';
import type { ItemBatch, RuleLibraryProvider } from './types';

const DEFAULT_PACKAGE = 'security_detection_engine';

const isRulePath = (path: string): boolean =>
  path.includes('/kibana/security_rule/') && path.endsWith('.json');

export class FleetProvider implements RuleLibraryProvider {
  private readonly packages: PackageClient;
  private readonly logger: Logger;
  private readonly packageName: string;

  constructor({
    packages,
    logger,
    packageName = DEFAULT_PACKAGE,
  }: {
    packages: PackageClient;
    logger: Logger;
    packageName?: string;
  }) {
    this.packages = packages;
    this.logger = logger;
    this.packageName = packageName;
  }

  async resolveVersion(_library: unknown, opts?: { pinned?: string }): Promise<LibraryVersionRef> {
    if (opts?.pinned) return { version: opts.pinned };
    const { version } = await this.packages.fetchFindLatestPackage(this.packageName);
    return { version };
  }

  async readLatestItems(
    _library: unknown,
    { version }: LibraryVersionRef,
    onBatch: ItemBatch
  ): Promise<void> {
    await this.walk(version, onBatch, () => true);
  }

  async readSpecificItems(
    _library: unknown,
    pairs: RuleKey[],
    { version }: LibraryVersionRef,
    onBatch: ItemBatch
  ): Promise<RuleKey[]> {
    const missing = new Map(pairs.map((pair) => [`${pair.rule_id}_${pair.version}`, pair]));
    await this.walk(version, onBatch, (item) => missing.delete(`${item.rule_id}_${item.version}`));
    return [...missing.values()];
  }

  private async walk(
    version: string,
    onBatch: ItemBatch,
    keep: (item: RuleLibraryItem) => boolean
  ): Promise<void> {
    const { archiveIterator } = await this.packages.getPackageStream(this.packageName, version);
    let batch: RuleLibraryItem[] = [];

    const flush = async () => {
      if (!batch.length) return;
      const items = batch;
      batch = [];
      await onBatch(items);
    };

    await archiveIterator.traverseEntries(async ({ path, buffer }) => {
      if (!buffer) return;
      const item = parseItem(path, buffer);
      if (!keep(item)) return;
      batch.push(item);
      if (batch.length >= BATCH_SIZE) await flush();
    }, isRulePath);
    await flush();
    this.logger.debug(`Read rules from ${this.packageName}@${version}`);
  }
}
