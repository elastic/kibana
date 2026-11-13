/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { EcsVersion } from '@elastic/ecs';
import type { AdvisorySource, CvssScore } from '../feeds/types';
import type { Finding } from '../matcher';
import type { FindingState } from './constants';
import { FINDINGS_DATASET, FINDINGS_VENDOR } from './constants';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export interface HostMeta {
  id: string;
  name?: string;
  os: { family: string; version: string; name?: string; kernel?: string };
}

interface CvssVendorScore {
  V3Score?: number;
  V3Vector?: string;
  V2Score?: number;
  V2Vector?: string;
}

export interface FindingDoc {
  '@timestamp': string;
  ecs: { version: string };
  event: {
    kind: 'state';
    category: ['vulnerability'];
    type: ['info'];
    id: string;
    dataset: string;
    module: 'native_vuln_scanner';
    created: string;
  };
  data_stream: { type: 'logs'; dataset: string; namespace: 'default' };
  observer: { vendor: string };
  resource: { id: string; name: string };
  host: { id: string; name: string; os: HostMeta['os'] };
  package: {
    name: string;
    version: string;
    fixed_version: string;
    architecture?: string;
    type: 'deb' | 'rpm';
  };
  vulnerability: {
    id: string;
    title: string;
    reference: string[];
    severity: FindingSeverity;
    score?: { base: number; version: string };
    cvss?: Partial<Record<'nvd' | 'redhat', CvssVendorScore>>;
    cwe?: string[];
    description: string;
    published_date?: string;
    enumeration: 'CVE';
    classification?: 'CVSS';
    scanner: { vendor: string };
    data_source: { ID: string; Name: string; URL?: string };
  };
  native_vuln_scanner: {
    finding_id: string;
    kind: Finding['kind'];
    scheme: Finding['scheme'];
    confidence: 'confirmed';
    state: FindingState;
    run_id: string;
    why: string;
    first_seen: string;
    last_seen: string;
    fixed_at?: string;
    feed_snapshot_time?: string;
    source_package?: string;
    advisories: Finding['advisories'];
  };
}

const SEVERITY_BY_VENDOR_LABEL: Readonly<Record<string, FindingSeverity>> = {
  // Ubuntu CVE priority.
  negligible: 'LOW',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
  // Red Hat impact.
  moderate: 'MEDIUM',
  important: 'HIGH',
};

/**
 * Flyout key for the CVSS block. Ubuntu's OVAL CVSS attributes are copied from NVD by the
 * Ubuntu CVE tracker, and the flyout only renders the `nvd`, `redhat` and `ghsa` keys.
 */
const CVSS_KEY: Readonly<Record<AdvisorySource, 'nvd' | 'redhat'>> = {
  ubuntu: 'nvd',
  redhat: 'redhat',
};

const DATA_SOURCE_NAME: Readonly<Record<AdvisorySource, string>> = {
  ubuntu: 'Ubuntu OVAL',
  redhat: 'Red Hat OVAL',
};

/** Vendor priority/impact label -> CNVM severity; `untriaged` and anything unknown -> UNKNOWN. */
export const toSeverity = (...labels: Array<string | undefined>): FindingSeverity => {
  for (const label of labels) {
    const key = label?.trim().toLowerCase();
    const severity =
      key && Object.hasOwn(SEVERITY_BY_VENDOR_LABEL, key) && SEVERITY_BY_VENDOR_LABEL[key];
    if (severity) return severity;
  }
  return 'UNKNOWN';
};

/** Stable id for one CVE on one installed package build of one host. */
export const findingId = ({ hostId, cve, package: pkg }: Finding): string =>
  createHash('sha256')
    .update(JSON.stringify([cve.id, hostId, pkg.name, pkg.arch ?? '', pkg.version]))
    .digest('hex');

const toCvssVendorScore = ({ version, score, vector }: CvssScore): CvssVendorScore =>
  version.startsWith('2')
    ? { V2Score: score, V2Vector: vector }
    : { V3Score: score, V3Vector: vector };

const references = ({ cve, advisories }: Finding): string[] => {
  const urls = [cve.url ?? `https://www.cve.org/CVERecord?id=${cve.id}`];
  for (const { url } of advisories) if (url) urls.push(url);
  return [...new Set(urls)];
};

export interface FindingDocContext {
  now: string;
  runId: string;
}

/**
 * Builds the ECS document for a first sighting; the writer's upsert script keeps `first_seen`
 * and recomputes `state` when the finding already exists.
 */
export const toFindingDoc = (
  finding: Finding,
  host: HostMeta,
  { now, runId }: FindingDocContext
): FindingDoc => {
  if (host.id !== finding.hostId) {
    throw new Error(`Host metadata ${host.id} does not belong to finding host ${finding.hostId}`);
  }
  const { cve, package: pkg, advisories } = finding;
  const [primary] = advisories;
  const id = findingId(finding);
  const name = host.name ?? host.id;
  return {
    '@timestamp': now,
    ecs: { version: EcsVersion },
    event: {
      kind: 'state',
      category: ['vulnerability'],
      type: ['info'],
      id,
      dataset: FINDINGS_DATASET,
      module: 'native_vuln_scanner',
      created: now,
    },
    data_stream: { type: 'logs', dataset: FINDINGS_DATASET, namespace: 'default' },
    observer: { vendor: FINDINGS_VENDOR },
    resource: { id: host.id, name },
    host: { id: host.id, name, os: host.os },
    package: {
      name: pkg.name,
      version: pkg.version,
      fixed_version: finding.fixedVersion,
      ...(pkg.arch ? { architecture: pkg.arch } : {}),
      type: finding.scheme === 'dpkg' ? 'deb' : 'rpm',
    },
    vulnerability: {
      id: cve.id,
      title: primary?.title || cve.id,
      reference: references(finding),
      severity: toSeverity(cve.severity, ...advisories.map((a) => a.severity)),
      ...(cve.cvss
        ? {
            score: { base: cve.cvss.score, version: cve.cvss.version },
            cvss: { [CVSS_KEY[primary?.source ?? 'ubuntu']]: toCvssVendorScore(cve.cvss) },
            classification: 'CVSS' as const,
          }
        : {}),
      ...(cve.cwe ? { cwe: [cve.cwe] } : {}),
      // The CNVM flyout shows `description` but nothing from `native_vuln_scanner`, so the
      // detection reason goes here until the flyout learns about it.
      description: `Detected because ${finding.why}.`,
      ...(cve.published ? { published_date: cve.published } : {}),
      enumeration: 'CVE',
      scanner: { vendor: FINDINGS_VENDOR },
      data_source: {
        ID: primary?.id ?? cve.id,
        Name: primary ? DATA_SOURCE_NAME[primary.source] : 'OVAL',
        ...(primary?.url ? { URL: primary.url } : {}),
      },
    },
    native_vuln_scanner: {
      finding_id: id,
      kind: finding.kind,
      scheme: finding.scheme,
      confidence: 'confirmed',
      state: 'new',
      run_id: runId,
      why: finding.why,
      first_seen: now,
      last_seen: now,
      ...(finding.feedSnapshotTime ? { feed_snapshot_time: finding.feedSnapshotTime } : {}),
      ...(pkg.source ? { source_package: pkg.source } : {}),
      advisories,
    },
  };
};
