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

export interface HostInventory {
  id: string;
  os: AdvisoryRecord['os'];
  /** `uname -r`; undefined when it was not collected. */
  kernelRelease?: string;
  /** Enabled module streams as `name:stream`; undefined when they were not collected. */
  enabledModules?: readonly string[];
  packages: readonly InstalledPackage[];
}

export type MatchedAdvisory = Pick<
  AdvisoryRecord['advisory'],
  'id' | 'source' | 'definition_id' | 'title' | 'url' | 'severity'
>;

export interface Finding {
  hostId: string;
  cve: AdvisoryCve;
  kind: AdvisoryRecord['kind'];
  package: InstalledPackage;
  /** Lowest fixed version across every advisory that matched this CVE and package. */
  fixedVersion: string;
  scheme: VersionScheme;
  advisories: MatchedAdvisory[];
  /** Human-readable reason for the lowest-fix match. */
  why: string;
  feedSnapshotTime?: string;
}

/** Counts of matches that could not be decided, keyed by reason (e.g. `unknown_module_enabled`). */
export type MatchStats = Record<string, number>;
