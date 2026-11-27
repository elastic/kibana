/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostMeta } from '../findings';
import type {
  HostInventory,
  InstalledPackage,
  LanguagePackage,
  WindowsHostInventory,
} from '../matcher';
import { kbDigitsOf } from '../matcher';
import { resolveWindowsOsProduct } from './windows_os_product';

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
  language?: readonly OsqueryRow[];
  /** The Windows `os_version` row; Windows agents never report the Linux queries. */
  windowsOs?: OsqueryRow;
  /** `patches` rows (`hotfix_id`); absent when the table could not be read. */
  patches?: readonly OsqueryRow[];
}

export interface NormalizedHost {
  inventory: HostInventory;
  meta: HostMeta;
}

export interface NormalizedWindowsHost {
  inventory: WindowsHostInventory;
  meta: HostMeta;
}

export type HostSkipReason =
  | 'missing_os_version'
  | 'unsupported_os'
  | 'missing_os_release'
  | 'missing_packages';

export interface NormalizeResult {
  hosts: NormalizedHost[];
  /** Windows hosts placed on an MSRC product; matched by build, not by package. */
  windowsHosts: NormalizedWindowsHost[];
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
 * One row of `elastic_language_packages`. Rows missing `purl` or `version` cannot be matched
 * against anything, so they are dropped with a reason; `namespace` is npm-only (`@scope`).
 */
export const normalizeLanguageRow = (
  row: OsqueryRow,
  skipped: Record<string, number> = {}
): LanguagePackage | undefined => {
  const purl = text(row.purl);
  const version = text(row.version);
  const name = text(row.name);
  if (!purl || !version || !name) {
    count(skipped, 'language_missing_field');
    return undefined;
  }
  return {
    ecosystem: text(row.ecosystem) ?? 'unknown',
    namespace: text(row.namespace),
    name,
    version,
    purl,
    path: text(row.path),
    manager: text(row.manager),
    installTime: text(row.install_time),
  };
};

/**
 * Maps `os_version` to the feed key. osquery reports `platform` from os-release `ID` and forces
 * `rhel` whenever `/etc/redhat-release` exists (so RHEL rebuilds report `rhel` too);
 * `platform_like` is deliberately not consulted — Amazon Linux 2 (`ID_LIKE="centos rhel fedora"`)
 * would otherwise be matched against the RHEL feed for the wrong major.
 */
export const normalizeOs = (row: OsqueryRow): HostOs | HostSkipReason => {
  const platform = text(row.platform)?.toLowerCase();
  if (platform === 'ubuntu') {
    const codename = text(row.codename)?.toLowerCase();
    return codename ? { family: 'ubuntu', version: codename } : 'missing_os_release';
  }
  if (platform === 'rhel') {
    const major = text(row.major);
    // osquery defaults `major` to "0" when it cannot read a version.
    return major && /^[1-9]\d*$/.test(major)
      ? { family: 'rhel', version: major }
      : 'missing_os_release';
  }
  return 'unsupported_os';
};

/** The counter key for a Windows host the resolver could not place, from its reason text. */
const windowsSkipReason = (reason: string): string => {
  if (reason.startsWith('no UBR')) return 'windows_no_ubr';
  if (reason.startsWith('no build')) return 'windows_no_build';
  if (reason.startsWith('unrecognised architecture')) return 'windows_unknown_arch';
  if (reason.includes('is not a supported Windows version')) return 'windows_unsupported_build';
  return 'windows_ambiguous_product';
};

const hotfixIdsOf = (rows: readonly OsqueryRow[] | undefined): string[] =>
  kbDigitsOf((rows ?? []).flatMap(({ hotfix_id: id }) => text(id) ?? []));

/**
 * Turns one snapshot per agent into matcher input. An agent without an OS row or without any
 * package row is skipped instead of scanned as empty: an empty inventory would mark every one
 * of its open findings fixed.
 */
export const normalizeInventories = (agents: Iterable<AgentInventoryRows>): NormalizeResult => {
  const hosts: NormalizedHost[] = [];
  const windowsHosts: NormalizedWindowsHost[] = [];
  const skippedHosts: NormalizeResult['skippedHosts'] = {};
  const skippedRows: Record<string, number> = {};
  const skip = (reason: HostSkipReason) => {
    skippedHosts[reason] = (skippedHosts[reason] ?? 0) + 1;
  };

  for (const agent of agents) {
    if (agent.windowsOs) {
      const resolved = resolveWindowsOsProduct(agent.windowsOs);
      if (!resolved.ok) {
        // A host that cannot be placed exactly is never scanned on a guess; its findings stay put.
        skip('unsupported_os');
        count(skippedRows, windowsSkipReason(resolved.reason));
        continue;
      }
      const { product } = resolved;
      windowsHosts.push({
        inventory: { id: agent.agentId, product, hotfixIds: hotfixIdsOf(agent.patches) },
        meta: {
          id: agent.agentId,
          name: agent.hostName,
          os: {
            family: 'windows',
            version: String(product.build),
            name: text(agent.windowsOs.name) ?? product.label,
            kernel: product.installedBuild,
          },
        },
      });
      continue;
    }
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
    // Optional everywhere: an agent whose beats predate the extension table reports no rows.
    const languagePackages = (agent.language ?? []).flatMap(
      (row) => normalizeLanguageRow(row, skippedRows) ?? []
    );
    hosts.push({
      // Module streams are not collectable with stock osquery, so they stay unknown.
      inventory: {
        id: agent.agentId,
        os,
        kernelRelease,
        packages,
        languagePackages: languagePackages.length > 0 ? languagePackages : undefined,
      },
      meta: {
        id: agent.agentId,
        name: agent.hostName,
        os: { ...os, name: text(agent.os.name), kernel: kernelRelease },
      },
    });
  }
  return { hosts, windowsHosts, skippedHosts, skippedRows };
};
