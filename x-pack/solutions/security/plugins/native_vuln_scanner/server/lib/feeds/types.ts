/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AdvisorySource = 'ubuntu' | 'redhat';

export type VersionScheme = 'dpkg' | 'rpm';

export interface CvssScore {
  version: string;
  score: number;
  vector: string;
}

export interface AdvisoryCve {
  id: string;
  url?: string;
  published?: string;
  severity?: string;
  cvss?: CvssScore;
  cwe?: string;
  usns?: string[];
}

/**
 * Extra host facts an advisory row needs besides the installed package version.
 * - `module_enabled`: RHEL modularity stream, e.g. `nodejs:18`.
 * - `running_kernel`: RHEL running kernel EVR test (`kernel` or `kernel-rt`).
 * - `kernel_release_matches`: Ubuntu `uname -r` pattern selecting the kernel flavour.
 */
export type AdvisoryCondition =
  | { type: 'module_enabled'; module: string }
  | { type: 'running_kernel'; package: string; operation: 'less than' | 'equals'; evr: string }
  | { type: 'kernel_release_matches'; pattern: string };

export interface ArchConstraint {
  operation: 'equals' | 'pattern match';
  value: string;
}

/**
 * Ubuntu kernel rows compare the running kernel, not a package: the installed version is
 * `prefix` + the first capture of `pattern` applied to `uname -r` (OVAL local_variable).
 */
export interface ReleaseVersionCapture {
  prefix: string;
  pattern: string;
}

/**
 * One "affected if installed < fixed" row. A host is affected when the installed version of
 * `package.name` (or of any `package.binaries` entry) sorts before `fixed_version`, and either
 * `conditions` is empty or every condition of at least one alternative holds (OR of ANDs).
 */
export interface AdvisoryRecord {
  advisory: {
    id: string;
    source: AdvisorySource;
    definition_id: string;
    title: string;
    url?: string;
    severity?: string;
    published?: string;
    modified?: string;
  };
  os: { family: 'ubuntu' | 'rhel'; version: string };
  kind: 'package' | 'running_kernel';
  package: {
    name: string;
    binaries?: string[];
    arch?: ArchConstraint;
    release_version?: ReleaseVersionCapture;
  };
  fixed_version: { raw: string; scheme: VersionScheme; key?: string };
  cves: AdvisoryCve[];
  conditions: AdvisoryCondition[][];
  feed: { snapshot_time?: string };
}

export interface FeedParseResult {
  os: { family: 'ubuntu' | 'rhel'; version: string };
  snapshotTime?: string;
  definitions: number;
  records: AdvisoryRecord[];
  /** Why definitions or criteria were dropped, with counts (e.g. `other_pocket`, `criteria_negated`). */
  skipped: Record<string, number>;
}
