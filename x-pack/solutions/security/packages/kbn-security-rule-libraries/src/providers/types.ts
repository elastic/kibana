/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { LibraryVersionRef, RuleKey, RuleLibraryAttributes, RuleLibraryItem } from '../types';
import type { RuleLibraryManifest } from '../manifest';

export type ItemBatch = (items: RuleLibraryItem[]) => Promise<void>;

export interface LibraryInspection {
  // Rule files in the release. A release holds one file per rule, at its latest version.
  ruleCount: number;
  manifest?: RuleLibraryManifest;
  // Set instead of a manifest when the file exists but cannot be used.
  manifestError?: string;
}

export interface RuleLibraryProvider {
  // Counts the rules of a release and reads its manifest, without downloading rule contents.
  inspect(library: RuleLibraryAttributes, ref: LibraryVersionRef): Promise<LibraryInspection>;
  resolveVersion(
    library: RuleLibraryAttributes,
    opts?: { pinned?: string }
  ): Promise<LibraryVersionRef>;
  readLatestItems(
    library: RuleLibraryAttributes,
    ref: LibraryVersionRef,
    onBatch: ItemBatch
  ): Promise<void>;
  // Returns the pairs that were not found.
  readSpecificItems(
    library: RuleLibraryAttributes,
    pairs: RuleKey[],
    ref: LibraryVersionRef,
    onBatch: ItemBatch
  ): Promise<RuleKey[]>;
}

export interface ProviderDeps {
  logger: Logger;
}
