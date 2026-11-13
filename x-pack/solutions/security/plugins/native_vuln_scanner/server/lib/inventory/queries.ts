/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InventoryQueryKind = 'deb_packages' | 'rpm_packages' | 'os_version' | 'kernel_info';

export interface InventoryQuery {
  id: string;
  query: string;
  platform: 'linux';
  /** Seconds. */
  interval: number;
  /** Snapshot mode: every run reports the full table, so one run is a complete inventory. */
  snapshot: true;
}

const DAY = 86_400;

const linuxSnapshot = (id: string, query: string): InventoryQuery => ({
  id,
  query,
  platform: 'linux',
  interval: DAY,
  snapshot: true,
});

/**
 * Queries of the `software-inventory` pack. `deb_packages.version` already carries the epoch;
 * rpm needs `epoch` and `release` to rebuild `epoch:version-release`. `source` is the dpkg source
 * package or the rpm SOURCERPM file name. `kernel_info.version` is the `uname -r` release.
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
};
