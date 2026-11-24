/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InventoryQueryKind =
  | 'deb_packages'
  | 'rpm_packages'
  | 'os_version'
  | 'kernel_info'
  | 'language_packages'
  | 'windows_os_version'
  | 'windows_patches';

export interface InventoryQuery {
  id: string;
  query: string;
  platform: 'linux' | 'windows';
  /** Seconds. */
  interval: number;
  /** Snapshot mode: every run reports the full table, so one run is a complete inventory. */
  snapshot: true;
}

const DAY = 86_400;

const snapshotQuery =
  (platform: InventoryQuery['platform']) =>
  (id: string, query: string): InventoryQuery => ({
    id,
    query,
    platform,
    interval: DAY,
    snapshot: true,
  });

const linuxSnapshot = snapshotQuery('linux');
const windowsSnapshot = snapshotQuery('windows');

/**
 * Queries of the `software-inventory` pack. `deb_packages.version` already carries the epoch;
 * rpm needs `epoch` and `release` to rebuild `epoch:version-release`. `source` is the dpkg source
 * package or the rpm SOURCERPM file name. `kernel_info.version` is the `uname -r` release.
 * `elastic_language_packages` is the osquerybeat extension table (Python and npm, one purl per
 * row); absent on agents whose beats predate it, which is why it is optional everywhere.
 * On Windows, `os_version` needs `build` and `revision` (the registry UBR) to place a host on an
 * update; `name` and `arch` are localized, so they only cross-check. `patches.hotfix_id` is
 * incomplete evidence of installed updates, never a verdict.
 */
export const INVENTORY_QUERIES: Readonly<Record<InventoryQueryKind, InventoryQuery>> = {
  deb_packages: linuxSnapshot(
    'native_vuln_scanner_deb_packages',
    'SELECT name, version, arch, source, status FROM deb_packages;'
  ),
  rpm_packages: linuxSnapshot(
    'native_vuln_scanner_rpm_packages',
    'SELECT name, epoch, version, release, arch, source FROM rpm_packages;'
  ),
  os_version: linuxSnapshot(
    'native_vuln_scanner_os_version',
    'SELECT platform, platform_like, codename, major, name, version FROM os_version;'
  ),
  kernel_info: linuxSnapshot('native_vuln_scanner_kernel_info', 'SELECT version FROM kernel_info;'),
  language_packages: linuxSnapshot(
    'native_vuln_scanner_language_packages',
    'SELECT ecosystem, namespace, name, version, purl, path, manager, install_time FROM elastic_language_packages;'
  ),
  windows_os_version: windowsSnapshot(
    'native_vuln_scanner_windows_os_version',
    'SELECT name, version, major, minor, build, revision, arch, platform FROM os_version;'
  ),
  windows_patches: windowsSnapshot(
    'native_vuln_scanner_windows_patches',
    'SELECT hotfix_id FROM patches;'
  ),
};

/** Inventory query kind by query id: how a live-query result, which carries no schedule id, is classified. */
export const KIND_BY_QUERY_ID: ReadonlyMap<string, InventoryQueryKind> = new Map(
  (Object.entries(INVENTORY_QUERIES) as Array<[InventoryQueryKind, InventoryQuery]>).map(
    ([kind, { id }]) => [id, kind]
  )
);
