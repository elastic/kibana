/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvisoryCondition, AdvisoryRecord, ArchConstraint } from '../feeds/types';
import type { Ordering } from '../version_compare';
import { compareDpkg, compareRpm } from '../version_compare';
import type { Finding, HostInventory, InstalledPackage, MatchStats } from './types';

interface OsIndex {
  byPackage: Map<string, AdvisoryRecord[]>;
  kernels: AdvisoryRecord[];
  /** Package names each RHEL definition lists, so srpm expansion never overrides an explicit row. */
  namesByDefinition: Map<string, Set<string>>;
}

export interface AdvisoryIndex {
  byOs: Map<string, OsIndex>;
}

type Verdict = 'true' | 'false' | 'unknown';

const osKey = ({ family, version }: AdvisoryRecord['os']): string => `${family}:${version}`;

const pushTo = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

const countInto = (stats: MatchStats | undefined, reason: string): void => {
  if (stats) stats[reason] = (stats[reason] ?? 0) + 1;
};

export const buildAdvisoryIndex = (records: readonly AdvisoryRecord[]): AdvisoryIndex => {
  const byOs = new Map<string, OsIndex>();
  for (const record of records) {
    const key = osKey(record.os);
    let os = byOs.get(key);
    if (!os) {
      os = { byPackage: new Map(), kernels: [], namesByDefinition: new Map() };
      byOs.set(key, os);
    }
    if (record.kind === 'running_kernel') {
      os.kernels.push(record);
      continue;
    }
    const names = record.package.binaries ?? [record.package.name];
    for (const name of names) pushTo(os.byPackage, name, record);
    const listed = os.namesByDefinition.get(record.advisory.definition_id) ?? new Set<string>();
    for (const name of names) listed.add(name);
    os.namesByDefinition.set(record.advisory.definition_id, listed);
  }
  return { byOs };
};

const regexCache = new Map<string, RegExp | null>();

/** OVAL `pattern match` is an unanchored regex search; feed patterns are compiled once. */
const compile = (pattern: string, stats?: MatchStats): RegExp | null => {
  let re = regexCache.get(pattern);
  if (re === undefined) {
    try {
      re = new RegExp(pattern);
    } catch {
      re = null;
    }
    regexCache.set(pattern, re);
  }
  if (re === null) countInto(stats, 'invalid_pattern');
  return re;
};

/** Feed arch patterns are alternations (`aarch64|x86_64`); anchored so `x86_64` never matches `x86_64_v2`. */
const archMatches = (
  constraint: ArchConstraint | undefined,
  arch: string | undefined,
  stats?: MatchStats
): boolean => {
  if (!constraint || arch === undefined) return true;
  if (constraint.operation === 'equals') return constraint.value === arch;
  return compile(`^(?:${constraint.value})$`, stats)?.test(arch) ?? false;
};

const RPM_KERNEL_SUFFIX = /(?:\.(?:x86_64|aarch64|ppc64le|s390x|i686|noarch))?(?:\+[\w-]+)?$/;

/** RHEL `uname -r` (`5.14.0-427.13.1.el9_4.x86_64[+rt-debug]`) as an rpm EVR. */
export const rhelKernelEvr = (kernelRelease: string): string =>
  `0:${kernelRelease.replace(RPM_KERNEL_SUFFIX, '')}`;

/** Ubuntu kernel ABI version: `prefix` + first capture of `pattern` on `uname -r`. */
export const ubuntuKernelVersion = (
  capture: NonNullable<AdvisoryRecord['package']['release_version']>,
  kernelRelease: string,
  stats?: MatchStats
): string | undefined => {
  const match = compile(capture.pattern, stats)?.exec(kernelRelease);
  return match?.[1] === undefined ? undefined : `${capture.prefix}${match[1]}`;
};

const evaluateCondition = (
  condition: AdvisoryCondition,
  host: HostInventory,
  stats?: MatchStats
): Verdict => {
  switch (condition.type) {
    case 'module_enabled':
      if (!host.enabledModules) return 'unknown';
      return host.enabledModules.includes(condition.module) ? 'true' : 'false';
    case 'running_kernel': {
      if (host.kernelRelease === undefined) return 'unknown';
      const order = compareRpm(rhelKernelEvr(host.kernelRelease), condition.evr);
      return (condition.operation === 'equals' ? order === 0 : order < 0) ? 'true' : 'false';
    }
    case 'kernel_release_matches': {
      if (host.kernelRelease === undefined) return 'unknown';
      return compile(condition.pattern, stats)?.test(host.kernelRelease) ? 'true' : 'false';
    }
  }
};

const describeCondition = (condition: AdvisoryCondition, host: HostInventory): string => {
  switch (condition.type) {
    case 'module_enabled':
      return `module ${condition.module} is enabled`;
    case 'running_kernel':
      return `running kernel ${host.kernelRelease} is ${
        condition.operation === 'equals' ? 'exactly' : 'earlier than'
      } ${condition.evr}`;
    case 'kernel_release_matches':
      return `running kernel ${host.kernelRelease} matches /${condition.pattern}/`;
  }
};

/**
 * Returns the first alternative whose conditions all hold (`[]` when the record has none), or a
 * verdict: `unknown` when no alternative fails outright but a host fact is missing.
 */
const satisfiedAlternative = (
  record: AdvisoryRecord,
  host: HostInventory,
  stats?: MatchStats
): AdvisoryCondition[] | Verdict => {
  if (record.conditions.length === 0) return [];
  let unknown: AdvisoryCondition | undefined;
  for (const alternative of record.conditions) {
    let alternativeUnknown: AdvisoryCondition | undefined;
    let failed = false;
    for (const condition of alternative) {
      const verdict = evaluateCondition(condition, host, stats);
      if (verdict === 'false') {
        failed = true;
        break;
      }
      if (verdict === 'unknown') alternativeUnknown ??= condition;
    }
    if (failed) continue;
    if (!alternativeUnknown) return alternative;
    unknown ??= alternativeUnknown;
  }
  if (unknown) {
    countInto(stats, `unknown_${unknown.type}`);
    return 'unknown';
  }
  return 'false';
};

/** rpm SOURCERPM file name (`gcc-11.3.1-4.3.el9.src.rpm`) to its name (`gcc`); bare names pass through. */
export const sourceRpmName = (source: string): string =>
  source.replace(/-[^-]+-[^-]+\.src\.rpm$/, '');

const compareFor = (record: AdvisoryRecord): ((a: string, b: string) => Ordering) =>
  record.fixed_version.scheme === 'dpkg' ? compareDpkg : compareRpm;

interface Hit {
  record: AdvisoryRecord;
  pkg: InstalledPackage;
  why: string;
}

/** Keeps the lowest fixed version per (CVE, installed package); ties collect every advisory. */
const collect = (hostId: string, hits: readonly Hit[]): Finding[] => {
  const findings = new Map<string, Finding>();
  for (const { record, pkg, why } of hits) {
    const compare = compareFor(record);
    for (const cve of record.cves) {
      const key = JSON.stringify([cve.id, pkg.name, pkg.arch ?? '', pkg.version]);
      const existing = findings.get(key);
      const advisory = {
        id: record.advisory.id,
        source: record.advisory.source,
        definition_id: record.advisory.definition_id,
        title: record.advisory.title,
        url: record.advisory.url,
        severity: record.advisory.severity,
      };
      const order = existing ? compare(record.fixed_version.raw, existing.fixedVersion) : -1;
      if (order < 0) {
        findings.set(key, {
          hostId,
          cve,
          kind: record.kind,
          package: pkg,
          fixedVersion: record.fixed_version.raw,
          scheme: record.fixed_version.scheme,
          advisories: [advisory],
          why,
          feedSnapshotTime: record.feed.snapshot_time,
        });
      } else if (
        order === 0 &&
        existing &&
        !existing.advisories.some((a) => a.id === advisory.id)
      ) {
        existing.advisories.push(advisory);
      }
    }
  }
  return [...findings.values()];
};

const conditionSuffix = (alternative: AdvisoryCondition[], host: HostInventory): string =>
  alternative.length ? `; ${alternative.map((c) => describeCondition(c, host)).join(' and ')}` : '';

const matchKernels = (os: OsIndex, host: HostInventory, hits: Hit[], stats?: MatchStats): void => {
  if (os.kernels.length === 0) return;
  const { kernelRelease } = host;
  if (kernelRelease === undefined) {
    countInto(stats, 'unknown_kernel_release');
    return;
  }
  for (const record of os.kernels) {
    const capture = record.package.release_version;
    if (!capture) continue;
    const alternative = satisfiedAlternative(record, host, stats);
    if (!Array.isArray(alternative)) continue;
    const running = ubuntuKernelVersion(capture, kernelRelease, stats);
    if (running === undefined || compareFor(record)(running, record.fixed_version.raw) >= 0) {
      continue;
    }
    hits.push({
      record,
      pkg: { name: record.package.name, version: running },
      why: `running kernel ${kernelRelease} (${running}) is earlier than ${
        record.fixed_version.raw
      } (${record.advisory.id}${conditionSuffix(alternative, host)})`,
    });
  }
};

/** Matches one host's inventory against the advisories for its OS release. */
export const matchHost = (
  host: HostInventory,
  index: AdvisoryIndex,
  stats?: MatchStats
): Finding[] => {
  const os = index.byOs.get(osKey(host.os));
  if (!os) {
    countInto(stats, 'no_advisories_for_os');
    return [];
  }

  const hits: Hit[] = [];
  const isRhel = host.os.family === 'rhel';
  const siblingsBySource = new Map<string, InstalledPackage[]>();
  if (isRhel) {
    for (const pkg of host.packages) {
      if (pkg.source) pushTo(siblingsBySource, sourceRpmName(pkg.source), pkg);
    }
  }

  for (const pkg of host.packages) {
    for (const record of os.byPackage.get(pkg.name) ?? []) {
      if (!archMatches(record.package.arch, pkg.arch, stats)) continue;
      const compare = compareFor(record);
      if (compare(pkg.version, record.fixed_version.raw) >= 0) continue;
      const alternative = satisfiedAlternative(record, host, stats);
      if (!Array.isArray(alternative)) continue;

      const via = record.package.name !== pkg.name ? `, source ${record.package.name}` : '';
      const suffix = conditionSuffix(alternative, host);
      hits.push({
        record,
        pkg,
        why: `${pkg.name} ${pkg.version} is earlier than ${record.fixed_version.raw} (${record.advisory.id}${via}${suffix})`,
      });

      // RHEL errata can list only some binaries of a source rpm; extend the hit to the
      // installed siblings it leaves out when they are also older than the fix.
      if (!isRhel || !pkg.source) continue;
      const source = sourceRpmName(pkg.source);
      const listed = os.namesByDefinition.get(record.advisory.definition_id);
      for (const sibling of siblingsBySource.get(source) ?? []) {
        if (sibling === pkg || listed?.has(sibling.name)) continue;
        if (compare(sibling.version, record.fixed_version.raw) >= 0) continue;
        hits.push({
          record,
          pkg: sibling,
          why: `${sibling.name} ${sibling.version} is earlier than ${record.fixed_version.raw} (${record.advisory.id}; built from source rpm ${source} like ${pkg.name}${suffix})`,
        });
      }
    }
  }

  matchKernels(os, host, hits, stats);
  return collect(host.id, hits);
};
