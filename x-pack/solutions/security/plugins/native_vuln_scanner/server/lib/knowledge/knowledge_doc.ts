/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AdvisorySource, KnowledgeEntry } from '../feeds/types';
import { truncateText } from '../truncate';
import { KNOWLEDGE_CAPS, KNOWLEDGE_LICENSES } from './constants';

export interface KnowledgeDoc {
  native_vuln_scanner: { knowledge_id: string };
  kind: KnowledgeEntry['kind'];
  source: AdvisorySource;
  os: { family: string; version: string };
  vulnerability?: { id: string; description?: string };
  impact?: string;
  solution?: string;
  workaround?: string;
  advisory?: {
    id: string;
    title?: string;
    summary?: string;
    url?: string;
    severity?: string;
    cves?: string[];
  };
  references?: string[];
  published?: string;
  /** The vendor's last-modified date; `modified` below says whether this excerpt was cut. */
  vendor_modified?: string;
  feed_snapshot_time?: string;
  /** Last write pass that checked this doc; a 304 only checks ids not yet stored, so it can lag the feed's refresh. */
  last_seen_in_feed: string;
  /** Hash of the content fields only, so a rescan of unchanged text writes nothing. */
  content_hash: string;
  attribution: string;
  license: string;
  license_url: string;
  /** The vendor's own page for this CVE or advisory. */
  source_url: string;
  /** True when any text was cut or split, so the flyout can point at the original. */
  modified: boolean;
}

export interface KnowledgeDocContext {
  source: AdvisorySource;
  os: { family: string; version: string };
  /** The feed's own copyright line; the licence block names the vendor when it has none. */
  attribution?: string;
  snapshotTime?: string;
  now: string;
}

const SOURCE_URL: Readonly<
  Record<AdvisorySource, { cve: (id: string) => string; advisory: (id: string) => string }>
> = {
  ubuntu: {
    cve: (id) => `https://ubuntu.com/security/${id}`,
    advisory: (id) => `https://ubuntu.com/security/notices/${id}`,
  },
  redhat: {
    cve: (id) => `https://access.redhat.com/security/cve/${id}`,
    advisory: (id) => `https://access.redhat.com/errata/${id}`,
  },
};

/** Cuts `value` to `max` and reports whether anything was lost. */
const cap = (value: string | undefined, max: number): { text?: string; cut: boolean } => {
  if (!value) return { cut: false };
  const text = truncateText(value, max);
  return { text, cut: text.length < value.length };
};

const sha256 = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Builds the KB doc for one parsed entry: applies the bounds, adds the licence block and
 * hashes the content. The hash leaves out the two feed-time fields and itself, because those
 * change on every feed refresh while the text does not.
 */
export const toKnowledgeDoc = (
  knowledgeId: string,
  entry: KnowledgeEntry,
  { source, os, attribution, snapshotTime, now }: KnowledgeDocContext
): KnowledgeDoc => {
  const isAdvisory = entry.kind === 'advisory';
  const description = cap(entry.description, KNOWLEDGE_CAPS.description);
  const impact = cap(entry.impact, KNOWLEDGE_CAPS.impact);
  const solution = cap(entry.solution, KNOWLEDGE_CAPS.solution);
  const workaround = cap(entry.workaround, KNOWLEDGE_CAPS.workaround);
  const summary = cap(entry.summary, KNOWLEDGE_CAPS.summary);
  const title = cap(entry.title, KNOWLEDGE_CAPS.title);
  const cves = entry.cves?.slice(0, KNOWLEDGE_CAPS.cves);
  const references = entry.references?.slice(0, KNOWLEDGE_CAPS.references);
  const license = KNOWLEDGE_LICENSES[source];

  const modified =
    entry.truncated === true ||
    [description, impact, solution, workaround, summary, title].some(({ cut }) => cut) ||
    (entry.cves?.length ?? 0) > KNOWLEDGE_CAPS.cves ||
    (entry.references?.length ?? 0) > KNOWLEDGE_CAPS.references;

  const content = {
    native_vuln_scanner: { knowledge_id: knowledgeId },
    kind: entry.kind,
    source,
    os,
    ...(isAdvisory
      ? {
          advisory: {
            id: entry.id,
            ...(title.text ? { title: title.text } : {}),
            ...(summary.text ? { summary: summary.text } : {}),
            ...(entry.url ? { url: entry.url } : {}),
            ...(entry.severity ? { severity: entry.severity } : {}),
            ...(cves?.length ? { cves } : {}),
          },
        }
      : {
          vulnerability: {
            id: entry.id,
            ...(description.text ? { description: description.text } : {}),
          },
        }),
    ...(impact.text ? { impact: impact.text } : {}),
    ...(solution.text ? { solution: solution.text } : {}),
    ...(workaround.text ? { workaround: workaround.text } : {}),
    ...(references?.length ? { references } : {}),
    ...(entry.published ? { published: entry.published } : {}),
    ...(entry.modified ? { vendor_modified: entry.modified } : {}),
    attribution: attribution ?? license.attribution,
    license: license.license,
    license_url: license.license_url,
    source_url: entry.url ?? SOURCE_URL[source][isAdvisory ? 'advisory' : 'cve'](entry.id),
    modified,
  };

  return {
    ...content,
    ...(snapshotTime ? { feed_snapshot_time: snapshotTime } : {}),
    last_seen_in_feed: now,
    content_hash: sha256(content),
  };
};
