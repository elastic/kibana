/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LibraryVersionRef, RuleLibraryAttributes } from '../types';
import type { RuleLibraryManifest } from '../manifest';
import type { RuleLibraryProvider } from '../providers/types';

export interface LibraryScanResult {
  version: string;
  ruleCount: number;
  manifest?: RuleLibraryManifest;
  manifestError?: string;
}

interface ScanLibraryParams {
  provider: RuleLibraryProvider;
  // The settings to try. Nothing is saved, so this can be an unsaved library.
  library: RuleLibraryAttributes;
  pinnedVersion?: string;
}

/**
 * Connects to a library and reports its release (the pinned one, or the latest), how many rules the
 * release holds and what its manifest says. It reads the file listing and the manifest only.
 */
export const scanLibrary = async ({
  provider,
  library,
  pinnedVersion,
}: ScanLibraryParams): Promise<LibraryScanResult> => {
  const ref: LibraryVersionRef = await provider.resolveVersion(library, { pinned: pinnedVersion });
  const { ruleCount, manifest, manifestError } = await provider.inspect(library, ref);

  return { version: ref.version, ruleCount, manifest, manifestError };
};
