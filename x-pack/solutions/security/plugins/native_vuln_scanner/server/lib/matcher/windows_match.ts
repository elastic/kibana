/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsrcAdvisoryRow, MsrcCve } from '../feeds/msrc_cvrf';
import { MAX_SUPERSEDED_KBS, SECURITY_UPDATE_SUB_TYPE } from '../feeds/msrc_cvrf';
import type { MsrcMonthSlice } from '../feeds/msrc_refresh';
import type { WindowsOsProduct } from '../inventory/windows_os_product';
import { compareWindowsBuild } from '../version_compare';
import type { Finding, MatchedAdvisory, MatchStats, WindowsRemediation } from './types';

/*
 * Windows hosts are matched on one number: the build the host runs against the build an update
 * brings. A CVE gives one finding per host whatever number of monthly documents list it. Whether
 * a finding exists depends on the CVE's own fix; the update it names is the window's latest one.
 *
 * `matchHost` cannot do this: it keeps the lowest fix per package, which on Windows would name an
 * old update that no longer clears the host.
 */

export interface WindowsHostInventory {
  id: string;
  product: WindowsOsProduct;
  /**
   * `patches.hotfix_id` values (`KB5131096` or digits). They only decide hotpatch enrolment: that
   * table is incomplete, so it never creates or suppresses a finding on its own.
   */
  hotfixIds?: readonly string[];
}

interface ProductAdvisories {
  /** KBs this product's feed rows mark as a hotpatch; a host with one of them is enrolled. */
  hotpatchKbs: Set<string>;
  /** Rows by servicing line (`build`), then by CVE. */
  byBuild: Map<number, Map<string, MsrcAdvisoryRow[]>>;
}

export interface WindowsAdvisoryIndex {
  byProduct: Map<string, ProductAdvisories>;
  cves: Map<string, MsrcCve>;
  /** Lowest regular fixed build in the window, by `${productId}:${build}`. A host below it may need older fixes. */
  windowFloor: Map<string, string>;
  /** The latest `Security Update` row in the window, by `${productId}:${build}`: the update to install. */
  ceiling: Map<string, MsrcAdvisoryRow>;
  /** The window's `Security Hotpatch Update` rows, one per KB, by `${productId}:${build}`. */
  hotpatches: Map<string, MsrcAdvisoryRow[]>;
  /**
   * What the ceiling update replaces, by `${productId}:${build}`: the union over every row of the
   * ceiling KB. One KB's rows differ in `Supercedence` (the CVRF lists a predecessor per
   * remediation entry), so the first row alone under-reports.
   */
  ceilingSupersedes: Map<string, string[]>;
}

const floorKey = (productId: string, build: number): string => `${productId}:${build}`;

const pushTo = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

const earliest = (rows: readonly MsrcAdvisoryRow[]): string | undefined =>
  rows.reduce<string | undefined>(
    (low, { fixedBuild }) =>
      low === undefined || compareWindowsBuild(fixedBuild, low) < 0 ? fixedBuild : low,
    undefined
  );

/** The row with the highest fixed build; the first one when builds tie. */
const latest = (rows: readonly MsrcAdvisoryRow[]): MsrcAdvisoryRow | undefined =>
  rows.reduce<MsrcAdvisoryRow | undefined>(
    (best, row) =>
      best === undefined || compareWindowsBuild(row.fixedBuild, best.fixedBuild) > 0 ? row : best,
    undefined
  );

/** Indexes the window's months, as {@link refreshMsrcFeed} returns them. */
export const buildWindowsAdvisoryIndex = (
  slices: ReadonlyArray<Pick<MsrcMonthSlice, 'rows' | 'cves'>>
): WindowsAdvisoryIndex => {
  const byProduct = new Map<string, ProductAdvisories>();
  const cves = new Map<string, MsrcCve>();
  for (const slice of slices) {
    for (const cve of slice.cves) cves.set(cve.id, cve);
    for (const row of slice.rows) {
      let product = byProduct.get(row.productId);
      if (!product) {
        product = { hotpatchKbs: new Set(), byBuild: new Map() };
        byProduct.set(row.productId, product);
      }
      if (row.hotpatch) product.hotpatchKbs.add(row.kb);
      let byCve = product.byBuild.get(row.build);
      if (!byCve) {
        byCve = new Map();
        product.byBuild.set(row.build, byCve);
      }
      pushTo(byCve, row.cve, row);
    }
  }

  const regular = new Map<string, MsrcAdvisoryRow[]>();
  const hotpatches = new Map<string, MsrcAdvisoryRow[]>();
  for (const slice of slices) {
    for (const row of slice.rows) {
      const key = floorKey(row.productId, row.build);
      if (row.subType === SECURITY_UPDATE_SUB_TYPE) pushTo(regular, key, row);
      if (row.hotpatch && !hotpatches.get(key)?.some(({ kb }) => kb === row.kb)) {
        pushTo(hotpatches, key, row);
      }
    }
  }
  const windowFloor = new Map<string, string>();
  const ceiling = new Map<string, MsrcAdvisoryRow>();
  const ceilingSupersedes = new Map<string, string[]>();
  for (const [key, rows] of regular) {
    const low = earliest(rows);
    if (low) windowFloor.set(key, low);
    const top = latest(rows);
    if (!top) continue;
    ceiling.set(key, top);
    const replaced = new Set<string>();
    for (const row of rows) {
      if (row.kb === top.kb) for (const kb of row.supersedes) replaced.add(kb);
    }
    ceilingSupersedes.set(key, [...replaced].slice(0, MAX_SUPERSEDED_KBS));
  }
  return { byProduct, cves, windowFloor, ceiling, hotpatches, ceilingSupersedes };
};

const KB_DIGITS = /^(?:KB)?(\d{1,9})$/i;

/** Most installed KBs kept on a finding as evidence. */
export const MAX_INSTALLED_KBS = 32;

/** `KB5131096`/`5131096` -> `5131096`; anything else is dropped. Deduplicated, in order, bounded. */
export const kbDigitsOf = (ids: readonly string[] | undefined): string[] => {
  const kbs = new Set<string>();
  for (const id of ids ?? []) {
    const kb = KB_DIGITS.exec(id.trim())?.[1];
    if (kb) kbs.add(kb);
    if (kbs.size >= MAX_INSTALLED_KBS) break;
  }
  return [...kbs];
};

const enrolmentKbOf = (
  hotfixIds: readonly string[] | undefined,
  hotpatchKbs: ReadonlySet<string>
): string | undefined => {
  for (const id of hotfixIds ?? []) {
    const kb = KB_DIGITS.exec(id.trim())?.[1];
    if (kb && hotpatchKbs.has(kb)) return kb;
  }
  return undefined;
};

/**
 * The row whose build the host has to reach. Regular hosts use the latest `Security Update` row.
 * A hotpatch-enrolled host is fixed at the lower of the hotpatch and that update, so when the
 * hotpatch build is lower the hotpatch row is the target; with no regular row it is the only fix.
 * Servicing stack and rollup rows are never a target: the sub-type picks the row, not `!hotpatch`.
 */
const targetRow = (
  rows: readonly MsrcAdvisoryRow[],
  enrolled: boolean
): { row: MsrcAdvisoryRow; kind: WindowsRemediation['kind'] } | undefined => {
  const regular = latest(rows.filter((row) => row.subType === SECURITY_UPDATE_SUB_TYPE));
  const hotpatch = enrolled ? latest(rows.filter((row) => row.hotpatch)) : undefined;
  if (hotpatch && (!regular || compareWindowsBuild(hotpatch.fixedBuild, regular.fixedBuild) < 0)) {
    return { row: hotpatch, kind: 'hotpatch' };
  }
  return regular ? { row: regular, kind: 'security_update' } : undefined;
};

/**
 * The update a finding tells the operator to install. `target` only decides whether the finding
 * exists (the CVE's own fix); the update named is the window's latest one for the product and
 * servicing line, because the CVE's own month is usually an update the host's next one replaces.
 * A hotpatch target names the latest hotpatch at or above the CVE's fixed build, and falls back to
 * the cumulative update when there is none.
 */
const remediationRow = (
  target: { row: MsrcAdvisoryRow; kind: WindowsRemediation['kind'] },
  index: WindowsAdvisoryIndex
): { row: MsrcAdvisoryRow; kind: WindowsRemediation['kind']; supersedes: readonly string[] } => {
  const { row, kind } = target;
  const key = floorKey(row.productId, row.build);
  if (kind === 'hotpatch') {
    const hotpatch = latest(
      (index.hotpatches.get(key) ?? []).filter(
        ({ fixedBuild }) => compareWindowsBuild(fixedBuild, row.fixedBuild) >= 0
      )
    );
    if (hotpatch) return { row: hotpatch, kind, supersedes: hotpatch.supersedes };
  }
  const top = index.ceiling.get(key);
  return top
    ? { row: top, kind: 'security_update', supersedes: index.ceilingSupersedes.get(key) ?? [] }
    : { ...target, supersedes: target.row.supersedes };
};

const toAdvisory = (row: MsrcAdvisoryRow, cve: MsrcCve | undefined): MatchedAdvisory => ({
  id: `KB${row.kb}`,
  source: 'msrc',
  definition_id: `${row.productId}:${row.kb}`,
  title: cve?.title ?? `KB${row.kb}`,
  url: `https://support.microsoft.com/help/${row.kb}`,
});

/**
 * Matches one Windows host: exactly one finding for each CVE the host's build is below the fix
 * of. Hosts whose product has no rows on their servicing line produce nothing.
 */
export const matchWindowsHost = (
  host: WindowsHostInventory,
  index: WindowsAdvisoryIndex,
  stats?: MatchStats
): Finding[] => {
  const { product } = host;
  const advisories = index.byProduct.get(product.productId);
  const byCve = advisories?.byBuild.get(product.build);
  if (!advisories || !byCve) {
    if (stats) stats.no_advisories_for_os = (stats.no_advisories_for_os ?? 0) + 1;
    return [];
  }

  const floor = index.windowFloor.get(floorKey(product.productId, product.build));
  if (stats && floor && compareWindowsBuild(product.installedBuild, floor) < 0) {
    stats.windows_build_older_than_window = (stats.windows_build_older_than_window ?? 0) + 1;
  }

  const enrolmentKb = enrolmentKbOf(host.hotfixIds, advisories.hotpatchKbs);
  const installedKbs = kbDigitsOf(host.hotfixIds);
  const findings: Finding[] = [];
  for (const [cveId, rows] of byCve) {
    const target = targetRow(rows, enrolmentKb !== undefined);
    if (!target) continue;
    if (compareWindowsBuild(product.installedBuild, target.row.fixedBuild) >= 0) continue;
    const { row: fixRow } = target;
    const { row, kind, supersedes } = remediationRow(target, index);
    const cve = index.cves.get(cveId);
    findings.push({
      hostId: host.id,
      cve: { id: cveId, ...(cve?.cvss ? { cvss: cve.cvss } : {}) },
      kind: 'package',
      package: { name: product.productId, version: product.installedBuild },
      fixedVersion: fixRow.fixedBuild,
      scheme: 'windows_build',
      advisories: [toAdvisory(row, cve)],
      why: `${product.label} build ${product.installedBuild} is below ${fixRow.fixedBuild}; install KB${row.kb} (${row.fixedBuild})`,
      windows: {
        kb: row.kb,
        supersededKbs: supersedes.slice(0, MAX_SUPERSEDED_KBS),
        fixedBuild: fixRow.fixedBuild,
        installedBuild: product.installedBuild,
        productId: product.productId,
        kind,
        installedKbs,
        ...(kind === 'hotpatch' && enrolmentKb ? { enrolmentKb } : {}),
      },
    });
  }
  return findings;
};
