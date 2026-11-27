/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvisoryCve, AdvisoryRecord, VersionScheme } from '../feeds/types';

export interface InstalledPackage {
  name: string;
  /** dpkg `[epoch:]upstream[-revision]` or rpm `[epoch:]version-release`. */
  version: string;
  arch?: string;
  /** Source package; for rpm either the SOURCERPM file name or its bare name. */
  source?: string;
}

/** One Python/npm row of the `elastic_language_packages` extension table. */
export interface LanguagePackage {
  ecosystem: string;
  namespace?: string;
  name: string;
  version: string;
  /** Package URL; OSV matching is an equality join on it (phase 3). */
  purl: string;
  path?: string;
  manager?: string;
  installTime?: string;
}

export interface HostInventory {
  id: string;
  os: AdvisoryRecord['os'];
  /** `uname -r`; undefined when it was not collected. */
  kernelRelease?: string;
  /** Enabled module streams as `name:stream`; undefined when they were not collected. */
  enabledModules?: readonly string[];
  packages: readonly InstalledPackage[];
  /**
   * Python/npm packages from the `elastic_language_packages` extension table; undefined when the
   * agent's beats predate the table (or it found nothing), so phase-3 matching can tell an old
   * agent from an empty one.
   */
  languagePackages?: readonly LanguagePackage[];
}

export type MatchedAdvisory = Pick<
  AdvisoryRecord['advisory'],
  'id' | 'source' | 'definition_id' | 'title' | 'url' | 'severity' | 'refs'
>;

/** Windows facts of a finding: which update clears it and why that one was chosen. */
export interface WindowsRemediation {
  /** The update to install (KB digits): the window's latest cumulative update, or the latest hotpatch for an enrolled host. */
  kb: string;
  /** Older KBs the remediation update replaces, at most 32. */
  supersededKbs: string[];
  /** `10.0.<build>.<ubr>` of the update that first fixed this CVE; a host at or above it has no finding. */
  fixedBuild: string;
  installedBuild: string;
  productId: string;
  kind: 'security_update' | 'hotpatch';
  /**
   * The host's `patches` KBs (digits, at most 32): evidence for the operator, never an input to
   * whether the finding exists.
   */
  installedKbs: string[];
  /** The hotpatch KB in `patches` that made the host count as enrolled; set for enrolled hosts only. */
  enrolmentKb?: string;
}

export interface Finding {
  hostId: string;
  cve: AdvisoryCve;
  kind: AdvisoryRecord['kind'];
  package: InstalledPackage;
  /** Lowest fixed version across every advisory that matched this CVE and package. */
  fixedVersion?: string;
  /** The vendor has not fixed this yet; set instead of `fixedVersion`. */
  unfixed?: true;
  /** The vendor's own wording, e.g. "Fix deferred" or "might be affected". */
  vendorReason?: string;
  scheme: VersionScheme;
  advisories: MatchedAdvisory[];
  /** Human-readable reason for the lowest-fix match. */
  why: string;
  feedSnapshotTime?: string;
  /** Windows findings only. */
  windows?: WindowsRemediation;
}

/** Counts of matches that could not be decided, keyed by reason (e.g. `unknown_module_enabled`). */
export type MatchStats = Record<string, number>;
