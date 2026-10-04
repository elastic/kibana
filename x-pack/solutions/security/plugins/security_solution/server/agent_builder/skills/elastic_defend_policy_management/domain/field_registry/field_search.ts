/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  POLICY_EVENT_COLLECTION_LABELS,
  POLICY_PROTECTION_UPDATES_LABEL,
} from '../../../../../../common/endpoint/models/policy_settings_ui_labels';
import type { PolicyOperatingSystem } from '../../../../../../common/endpoint/types';
import { getFieldRegistry, getFieldRegistryEntry } from './derive_field_registry';
import { describePathWritability, type PathNotWritableReason } from './path_writability';

const RESULT_LIMIT = 10;
const EVENT_COLLECTION_OSES = ['windows', 'mac', 'linux'] as const;

type SearchOperatingSystem = 'windows' | 'mac' | 'linux';

export type PolicyFieldSearchHit = {
  readonly path: string;
  readonly os: readonly PolicyOperatingSystem[];
  readonly label?: string;
} & (
  | { readonly writable: true }
  | { readonly writable: false; readonly not_writable_reason: PathNotWritableReason }
);

export interface PolicyFieldSearchResult {
  readonly found: boolean;
  readonly match: 'search';
  readonly keywords: readonly string[];
  readonly os?: SearchOperatingSystem;
  readonly results: readonly PolicyFieldSearchHit[];
  readonly results_total: number;
  readonly results_truncated: boolean;
}

interface IndexedPolicyField {
  readonly path: string;
  readonly os: readonly PolicyOperatingSystem[];
  readonly order: number;
  readonly label?: string;
}

const requireLabelRegistryEntry = (path: string): void => {
  if (getFieldRegistryEntry(path) === undefined) {
    throw new Error(`Policy settings UI label has no registry entry: ${path}`);
  }
};

const sharedLabelsByPath = (): ReadonlyMap<string, string> => {
  const labels = new Map<string, string>();
  for (const os of EVENT_COLLECTION_OSES) {
    for (const { field, label } of POLICY_EVENT_COLLECTION_LABELS[os]) {
      const path = `${os}.events.${field}`;
      requireLabelRegistryEntry(path);
      labels.set(path, label);
    }
  }
  requireLabelRegistryEntry(POLICY_PROTECTION_UPDATES_LABEL.path);
  labels.set(POLICY_PROTECTION_UPDATES_LABEL.path, POLICY_PROTECTION_UPDATES_LABEL.label);
  return labels;
};

const sharedLabels = sharedLabelsByPath();
const SEARCH_INDEX: readonly IndexedPolicyField[] = getFieldRegistry().map((entry, order) => {
  const label = sharedLabels.get(entry.path);
  return {
    path: entry.path,
    os: [...entry.os],
    order,
    ...(label !== undefined ? { label } : {}),
  };
});

const matchesOs = (
  entryOs: readonly PolicyOperatingSystem[],
  os: SearchOperatingSystem | undefined
): boolean =>
  os === undefined || entryOs.length === 0 || entryOs.includes(os as PolicyOperatingSystem);

const matchesKeyword = (indexed: IndexedPolicyField, keyword: string): boolean => {
  const normalizedKeyword = keyword.toLocaleLowerCase();
  return (
    indexed.path.toLocaleLowerCase().includes(normalizedKeyword) ||
    indexed.label?.toLocaleLowerCase().includes(normalizedKeyword) === true
  );
};

export const searchPolicyFields = (
  keywords: readonly string[],
  os?: SearchOperatingSystem
): PolicyFieldSearchResult => {
  const matches = SEARCH_INDEX.filter(
    (indexed) =>
      matchesOs(indexed.os, os) && keywords.every((keyword) => matchesKeyword(indexed, keyword))
  );
  const orderedMatches = [...matches].sort((left, right) => {
    const leftWritable = describePathWritability(left.path).writable;
    const rightWritable = describePathWritability(right.path).writable;
    return leftWritable === rightWritable ? left.order - right.order : leftWritable ? -1 : 1;
  });
  const results = orderedMatches.slice(0, RESULT_LIMIT).map((indexed): PolicyFieldSearchHit => {
    const writability = describePathWritability(indexed.path);
    const base = {
      path: indexed.path,
      os: indexed.os,
      ...(indexed.label !== undefined ? { label: indexed.label } : {}),
    };
    return writability.writable
      ? { ...base, writable: true }
      : { ...base, writable: false, not_writable_reason: writability.reason };
  });

  return {
    found: matches.length > 0,
    match: 'search',
    keywords,
    ...(os === undefined ? {} : { os }),
    results,
    results_total: matches.length,
    results_truncated: matches.length > RESULT_LIMIT,
  };
};
