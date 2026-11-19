/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rpmKey, UnencodableVersionError } from '../version_compare';
import { countInto } from './oval';
import { readJsonDocuments } from './json';
import type { AdvisoryCve, AdvisoryRecord, CvssScore, FeedParseResult } from './types';

/*
 * Red Hat CSAF (VEX), the only advisory format published for RHEL 10+ (OVAL v2 is
 * maintenance-mode upstream and carries nothing for those majors). The feed is a
 * JSON array of advisory documents streamed one document at a time (json.ts); each
 * advisory is parsed on its own and dropped.
 *
 * Per advisory we keep only what the matcher needs: the CVE entries and the
 * product_status["fixed"] ids. Those are composite ids ("AppStream-10.2.Z:pkg-E:V-R.arch")
 * that product_tree.relationships tie to a package leaf (purl preferred, name NEVRA as
 * fallback) and a stream; only main-stream BaseOS/AppStream/CRB groups of the wanted
 * major count, so other families and EUS/AUS streams are skipped by construction.
 */

/**
 * Main-stream product groups only: `Red Hat Enterprise Linux BaseOS (v. 10)`. EUS/AUS/E4S/TUS
 * streams carry their own (`el10_0`) fix versions that would flag hosts on the main stream.
 */
const RHEL_MAJOR_GROUP =
  /^Red Hat Enterprise Linux (?:BaseOS|AppStream|CodeReady Linux Builder|CRB) \(v\. (\d+)\)$/;

/** `pkg:rpm/redhat/name@version-release?arch=x86_64`. */
const PURL = /^pkg:rpm\/[^/]+\/([^@/]+)@([^?]+)\?(\S+)$/;

/** `cockpit-0:356.1-1.el10_2.noarch`: Red Hat's NEVRA-in-name convention. */
const NAME_NEVRA = /^(.+?)-(\d+):([^-]+)-(.+)\.([^.]+)$/;

interface CsafObject {
  [key: string]: unknown;
}

const asObject = (value: unknown): CsafObject | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as CsafObject)
    : undefined;
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** A fixed package resolved from the product tree. */
interface FixedEntry {
  name: string;
  evr: string;
  arch: string;
}

/**
 * What the product tree resolves: package leaves by `product_id`, stream ids of the wanted major, and
 * the relationships that tie a package leaf to a stream (`fixed` ids name those composites).
 */
interface ProductIndex {
  packages: Map<string, FixedEntry>;
  /** `product_id`s of the stream groups (BaseOS/AppStream/CRB) of the wanted major. */
  streams: Set<string>;
  /** Composite `product_id` -> package leaf id, for composites inside a wanted stream. */
  composites: Map<string, string>;
}

/** Extracts `{name, evr, arch}` from a full_product_name, preferring its purl. */
const fixedEntryOf = (product: CsafObject): FixedEntry | undefined => {
  const purl = asString(asObject(product.product_identification_helper)?.purl);
  const fromPurl = purl ? PURL.exec(purl) : null;
  if (fromPurl) {
    // A purl omits the epoch when it is 0 and otherwise carries it as `epoch=N`; OVAL spells it out.
    const qualifiers = new URLSearchParams(fromPurl[3]);
    const arch = qualifiers.get('arch');
    if (!arch) return undefined;
    return { name: fromPurl[1], evr: `${qualifiers.get('epoch') ?? '0'}:${fromPurl[2]}`, arch };
  }
  const name = asString(product.name);
  const m = name ? NAME_NEVRA.exec(name) : null;
  // The epoch stays in the EVR string the matcher compares, in Red Hat's spelling.
  return m ? { name: m[1], evr: `${m[2]}:${m[3]}-${m[4]}`, arch: m[5] } : undefined;
};

const indexProductTree = (tree: CsafObject | undefined, major: string): ProductIndex => {
  const index: ProductIndex = { packages: new Map(), streams: new Set(), composites: new Map() };
  const walk = (nodes: unknown[]): void => {
    for (const node of nodes) {
      const branch = asObject(node);
      if (!branch) continue;
      const category = asString(branch.category);
      const product = asObject(branch.product);
      const productId = asString(product?.product_id);
      if (category === 'product_name' && productId) {
        const group = asString(branch.name);
        if (group && RHEL_MAJOR_GROUP.exec(group)?.[1] === major) index.streams.add(productId);
      } else if (category === 'product_version' && product && productId) {
        const entry = fixedEntryOf(product);
        if (entry) index.packages.set(productId, entry);
      }
      walk(asArray(branch.branches));
    }
  };
  walk(asArray(tree?.branches));
  for (const rel of asArray(tree?.relationships)) {
    const r = asObject(rel);
    const compositeId = asString(asObject(r?.full_product_name)?.product_id);
    const reference = asString(r?.product_reference);
    const stream = asString(r?.relates_to_product_reference);
    if (compositeId && reference && stream && index.streams.has(stream)) {
      index.composites.set(compositeId, reference);
    }
  }
  return index;
};

const isoDate = (value: unknown): string | undefined => {
  const s = asString(value);
  return s && /^\d{4}-\d{2}-\d{2}T/.test(s) ? s : undefined;
};

const severityWord = (raw: unknown): string | undefined => {
  const s = asString(raw);
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : undefined;
};

const cveUrl = (id: string): string => `https://access.redhat.com/security/cve/${id}`;

/** Parses one CSAF advisory document; undefined when it does not touch the major. */
const parseAdvisory = (
  doc: unknown,
  major: string,
  skipped: Record<string, number>
): PendingCsaf | undefined => {
  const root = asObject(doc);
  const document = asObject(root?.document);
  const tracking = asObject(document?.tracking);
  const advisoryId = asString(tracking?.id);
  if (!advisoryId) {
    countInto(skipped, 'malformed_document');
    return undefined;
  }
  const index = indexProductTree(asObject(root?.product_tree), major);
  if (index.streams.size === 0) return undefined;

  const selfUrl = asArray(document?.references)
    .map((r) => asObject(r))
    .find((r) => asString(r?.category) === 'self' && asString(r?.url)?.includes('/errata/'));
  const vulns: Array<{ cve: AdvisoryCve; fixed: FixedEntry[] }> = [];
  for (const v of asArray(root?.vulnerabilities)) {
    const cveId = asString(asObject(v)?.cve);
    if (!cveId) {
      countInto(skipped, 'vulnerability_without_cve');
      continue;
    }
    const fixed = new Map<string, FixedEntry>();
    for (const id of asArray(asObject(asObject(v)?.product_status)?.fixed)) {
      const leaf = typeof id === 'string' ? index.composites.get(id) : undefined;
      const entry = leaf ? index.packages.get(leaf) : undefined;
      // The same build is listed once per stream (BaseOS, AppStream, ...): keep one.
      if (entry) fixed.set(`${entry.name}|${entry.arch}|${entry.evr}`, entry);
    }
    if (fixed.size === 0) {
      countInto(skipped, 'no_fixed_in_major');
      continue;
    }
    const score = asObject(asArray(asObject(v)?.scores)[0]);
    const cvssV3 = asObject(score?.cvss_v3);
    const vector = asString(cvssV3?.vectorString);
    const base = asNumber(cvssV3?.baseScore);
    const cve: AdvisoryCve = { id: cveId, url: cveUrl(cveId) };
    if (vector && base !== undefined) {
      const cvss: CvssScore = { version: asString(cvssV3?.version) ?? '3.1', score: base, vector };
      cve.cvss = cvss;
      cve.severity = severityWord(cvssV3?.baseSeverity);
    }
    vulns.push({ cve, fixed: [...fixed.values()] });
  }
  if (vulns.length === 0) return undefined;
  return {
    advisoryId,
    title: asString(document?.title) ?? '',
    url: asString(selfUrl?.url),
    severity: severityWord(asObject(document?.aggregate_severity)?.text),
    published: isoDate(tracking?.initial_release_date),
    modified: isoDate(tracking?.current_release_date),
    vulns,
  };
};

interface PendingCsaf {
  advisoryId: string;
  title: string;
  url?: string;
  severity?: string;
  published?: string;
  modified?: string;
  /** Vulnerabilities with at least one fixed package of the wanted major. */
  vulns: Array<{ cve: AdvisoryCve; fixed: FixedEntry[] }>;
}

export interface ParseRhelCsafOptions {
  /** Major release the feed is parsed for, e.g. `10`. */
  major: string;
}

/**
 * Streams a CSAF feed (JSON array of advisory documents) and emits the normalized
 * advisory records for one RHEL major. Advisories not touching the major cost only
 * the document split; each is dropped as soon as it is parsed.
 */
export const parseRhelCsaf = async (
  input: AsyncIterable<Uint8Array | string> | Iterable<Uint8Array | string>,
  { major }: ParseRhelCsafOptions
): Promise<FeedParseResult> => {
  const skipped: Record<string, number> = {};
  const pending: PendingCsaf[] = [];
  let definitions = 0;
  let snapshotTime: string | undefined;

  await readJsonDocuments(input, {
    onDocument: (doc) => {
      const advisory = parseAdvisory(doc, major, skipped);
      if (!advisory) return;
      definitions++;
      pending.push(advisory);
    },
  });

  // Freshness signal like OVAL's `generated` timestamp: the newest advisory revision date.
  let newest = Number.NEGATIVE_INFINITY;
  for (const advisory of pending) {
    const stamp = advisory.modified ?? advisory.published;
    const ms = stamp ? Date.parse(stamp) : NaN;
    if (Number.isFinite(ms) && ms > newest) {
      newest = ms;
      snapshotTime = stamp;
    }
  }

  const os = { family: 'rhel' as const, version: major };
  const records: AdvisoryRecord[] = [];
  for (const advisory of pending) {
    for (const { cve, fixed } of advisory.vulns) {
      for (const entry of fixed) {
        // Source rpms are never installed; noarch fixes carry no arch signal.
        if (entry.arch === 'src' || entry.arch === 'noarch') continue;
        let key: string | undefined;
        try {
          key = rpmKey(entry.evr);
        } catch (e) {
          if (!(e instanceof UnencodableVersionError)) throw e;
          countInto(skipped, 'unencodable_version_kept');
        }
        records.push({
          advisory: {
            id: advisory.advisoryId,
            source: 'redhat',
            definition_id: advisory.advisoryId,
            title: advisory.title,
            url: advisory.url,
            severity: advisory.severity,
            published: advisory.published,
            modified: advisory.modified,
          },
          os,
          kind: 'package',
          package: { name: entry.name, arch: { operation: 'equals', value: entry.arch } },
          fixed_version: { raw: entry.evr, scheme: 'rpm' as const, key },
          cves: [cve],
          conditions: [],
          feed: { snapshot_time: snapshotTime },
        });
      }
    }
  }

  return { os, snapshotTime, definitions, records, skipped };
};
