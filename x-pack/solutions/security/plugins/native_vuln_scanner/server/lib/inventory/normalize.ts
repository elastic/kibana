/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostMeta } from '../findings';
import type { HostInventory, InstalledPackage } from '../matcher';

/** One osquery result row as stored under `osquery.*`; osquerybeat types numeric columns. */
export type OsqueryRow = Readonly<Record<string, unknown>>;

/** The latest snapshot of each inventory query for one agent. */
export interface AgentInventoryRows {
  agentId: string;
  hostName?: string;
  deb?: readonly OsqueryRow[];
  rpm?: readonly OsqueryRow[];
  os?: OsqueryRow;
  kernel?: OsqueryRow;
}

export interface NormalizedHost {
  inventory: HostInventory;
  meta: HostMeta;
}

export type HostSkipReason =
  | 'missing_os_version'
  | 'unsupported_os'
  | 'missing_os_release'
  | 'missing_packages';

export interface NormalizeResult {
  hosts: NormalizedHost[];
  /** Agents left out of the run, by reason; their findings are left untouched. */
  skippedHosts: Partial<Record<HostSkipReason, number>>;
  /** Package rows dropped, by reason (e.g. `deb_not_installed`, `rpm_missing_field`). */
  skippedRows: Record<string, number>;
}

const text = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const count = (into: Record<string, number>, reason: string): void => {
  into[reason] = (into[reason] ?? 0) + 1;
};

/**
 * dpkg states whose files are not on disk at the recorded version. osquery already drops
 * `not-installed`; the rest are leftovers (`config-files`) or a broken install.
 */
const DPKG_ABSENT_STATES = new Set(['not-installed', 'config-files', 'half-installed']);

/** A binary built from a differently versioned source carries `Source: name (version)`. */
const stripSourceVersion = (source: string): string => source.replace(/\s*\(.*\)\s*$/, '');

export const normalizeDebRow = (
  row: OsqueryRow,
  skipped: Record<string, number> = {}
): InstalledPackage | undefined => {
  const name = text(row.name);
  const version = text(row.version);
  if (!name || !version) {
    count(skipped, 'deb_missing_field');
    return undefined;
  }
  // `status` is "<want> <eflag> <status>"; agents that predate the column report none.
  const status = text(row.status)?.split(/\s+/).pop();
  if (status && DPKG_ABSENT_STATES.has(status)) {
    count(skipped, 'deb_not_installed');
    return undefined;
  }
  const source = text(row.source);
  return {
    name,
    version,
    arch: text(row.arch),
    source: source ? stripSourceVersion(source) : name,
  };
};

export const normalizeRpmRow = (
  row: OsqueryRow,
  skipped: Record<string, number> = {}
): InstalledPackage | undefined => {
  const name = text(row.name);
  const version = text(row.version);
  const release = text(row.release);
  if (!name || !version || !release) {
    count(skipped, 'rpm_missing_field');
    return undefined;
  }
  // Imported signing keys show up as packages; nothing ever fixes them.
  if (name === 'gpg-pubkey') {
    count(skipped, 'rpm_gpg_pubkey');
    return undefined;
  }
  const epoch = text(row.epoch);
  const arch = text(row.arch);
  return {
    name,
    version: `${epoch && /^\d+$/.test(epoch) ? epoch : '0'}:${version}-${release}`,
    arch: arch === '(none)' ? undefined : arch,
    source: text(row.source),
  };
};

type HostOs = HostInventory['os'];

/**
 * Maps `os_version` to the feed key. osquery reports `platform` from os-release `ID` and forces
 * `rhel` whenever `/etc/redhat-release` exists (so RHEL rebuilds report `rhel` too).
 */
export const normalizeOs = (row: OsqueryRow): HostOs | HostSkipReason => {
  const platform = text(row.platform)?.toLowerCase();
  const like = (text(row.platform_like)?.toLowerCase() ?? '').split(/\s+/);
  if (platform === 'ubuntu') {
    const codename = text(row.codename)?.toLowerCase();
    return codename ? { family: 'ubuntu', version: codename } : 'missing_os_release';
  }
  if (platform === 'rhel' || like.includes('rhel')) {
    const major = text(row.major);
    // osquery defaults `major` to "0" when it cannot read a version.
    return major && /^[1-9]\d*$/.test(major)
      ? { family: 'rhel', version: major }
      : 'missing_os_release';
  }
  return 'unsupported_os';
};

/**
 * Turns one snapshot per agent into matcher input. An agent without an OS row or without any
 * package row is skipped instead of scanned as empty: an empty inventory would mark every one
 * of its open findings fixed.
 */
export const normalizeInventories = (agents: Iterable<AgentInventoryRows>): NormalizeResult => {
  const hosts: NormalizedHost[] = [];
  const skippedHosts: NormalizeResult['skippedHosts'] = {};
  const skippedRows: Record<string, number> = {};
  const skip = (reason: HostSkipReason) => {
    skippedHosts[reason] = (skippedHosts[reason] ?? 0) + 1;
  };

  for (const agent of agents) {
    if (!agent.os) {
      skip('missing_os_version');
      continue;
    }
    const os = normalizeOs(agent.os);
    if (typeof os === 'string') {
      skip(os);
      continue;
    }
    const packages =
      os.family === 'ubuntu'
        ? (agent.deb ?? []).flatMap((row) => normalizeDebRow(row, skippedRows) ?? [])
        : (agent.rpm ?? []).flatMap((row) => normalizeRpmRow(row, skippedRows) ?? []);
    if (packages.length === 0) {
      skip('missing_packages');
      continue;
    }
    const kernelRelease = agent.kernel ? text(agent.kernel.version) : undefined;
    hosts.push({
      // Module streams are not collectable with stock osquery, so they stay unknown.
      inventory: { id: agent.agentId, os, kernelRelease, packages },
      meta: {
        id: agent.agentId,
        name: agent.hostName,
        os: { ...os, name: text(agent.os.name), kernel: kernelRelease },
      },
    });
  }
  return { hosts, skippedHosts, skippedRows };
};
