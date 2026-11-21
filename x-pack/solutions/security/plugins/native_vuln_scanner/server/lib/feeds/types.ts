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
 * One advisory row. A host is affected when the installed version of `package.name` (or of any
 * `package.binaries` entry) sorts before `fixed_version`, and either `conditions` is empty or
 * every condition of at least one alternative holds (OR of ANDs). When `unfixed` is set there is
 * no fixed version yet: any installed version is affected (for `running_kernel` kind: when the
 * running kernel matches the flavour pattern).
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
    /** Every `<reference>` of the definition (advisory, CVEs, vendor notices), capped at 10. */
    refs?: Array<{ id: string; url: string }>;
  };
  os: { family: 'ubuntu' | 'rhel'; version: string };
  kind: 'package' | 'running_kernel';
  package: {
    name: string;
    binaries?: string[];
    arch?: ArchConstraint;
    release_version?: ReleaseVersionCapture;
  };
  /** Absent when `unfixed`: the vendor has shipped no fixed version yet. */
  fixed_version?: { raw: string; scheme: VersionScheme; key?: string };
  /** The vendor has not fixed this yet; the record matches any installed version. */
  unfixed?: true;
  /** The vendor's own wording, e.g. "Fix deferred" or "might be affected". */
  vendor_reason?: string;
  cves: AdvisoryCve[];
  conditions: AdvisoryCondition[][];
  feed: { snapshot_time?: string };
}

/**
 * Vendor prose for one CVE or advisory, kept apart from `AdvisoryRecord` so the matcher's
 * per-row memory does not grow. Keyed in `FeedParseResult.knowledge` by the KB doc id.
 */
export interface KnowledgeEntry {
  /** `rejected` is a CVE the vendor withdrew; its description holds the reason. */
  kind: 'cve' | 'advisory' | 'rejected';
  /** CVE id or advisory id. */
  id: string;
  title?: string;
  description?: string;
  impact?: string;
  solution?: string;
  workaround?: string;
  /** Advisory-level summary (advisory entries only). */
  summary?: string;
  /** The vendor's own page for this CVE or advisory. */
  url?: string;
  severity?: string;
  /** CVE ids an advisory covers. */
  cves?: string[];
  references?: string[];
  published?: string;
  modified?: string;
  /** The text was cut or split while parsing (as opposed to the KB caps applied later). */
  truncated?: true;
}

export interface FeedParseResult {
  os: { family: 'ubuntu' | 'rhel'; version: string };
  snapshotTime?: string;
  definitions: number;
  records: AdvisoryRecord[];
  /** Why definitions or criteria were dropped, with counts (e.g. `other_pocket`, `criteria_negated`). */
  skipped: Record<string, number>;
  /** Vendor prose by KB doc id (`cve:<source>:<release>:<CVE>`, `adv:<source>:<release>:<advisory>`). */
  knowledge: Map<string, KnowledgeEntry>;
  /** The feed's own copyright line, shown as the licence attribution. */
  attribution?: string;
}
