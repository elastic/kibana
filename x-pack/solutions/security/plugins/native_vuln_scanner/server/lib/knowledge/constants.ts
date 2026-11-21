/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { knowledgeReleaseToken } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import type { AdvisorySource } from '../feeds/types';

/**
 * Lookup-mode index (`LOOKUP JOIN ... ON native_vuln_scanner.knowledge_id`). The name must match
 * `security_solution-*.vulnerability_latest-*`, the only security_solution pattern the reserved
 * `kibana_system` role may write. It matches neither the findings alias nor the findings
 * template pattern (`security_solution-native.vulnerability_latest-*`).
 */
export const KNOWLEDGE_INDEX = 'security_solution-native_knowledge.vulnerability_latest-1';

/** Bounds on the vendor prose stored per doc, in UTF-16 units. */
export const KNOWLEDGE_CAPS = {
  title: 1024,
  description: 16 * 1024,
  impact: 4 * 1024,
  solution: 8 * 1024,
  workaround: 8 * 1024,
  summary: 8 * 1024,
  references: 20,
  cves: 200,
} as const;

/** `last_seen_in_feed` is refreshed at most this often per doc. */
export const LAST_SEEN_REFRESH_MS = 24 * 60 * 60 * 1000;

export const MGET_BATCH = 1000;
export const BULK_BATCH = 500;

export interface KnowledgeLicense {
  license: string;
  license_url: string;
  /** Used when the feed carries no copyright line of its own. */
  attribution: string;
}

export const KNOWLEDGE_LICENSES: Readonly<Record<AdvisorySource, KnowledgeLicense>> = {
  ubuntu: {
    license: 'CC-BY-SA-4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: 'Canonical Ltd.',
  },
  redhat: {
    license: 'CC-BY-4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Red Hat, Inc.',
  },
};

/** Id-safe form of an OS release (`noble`, `9`, `10`). */
export const releaseToken = knowledgeReleaseToken;

/**
 * Doc id of the CVE entry for a finding; also its `native_vuln_scanner.knowledge_id`. The release
 * is part of the id because two releases of one vendor carry different text for the same CVE.
 */
export const cveKnowledgeId = (source: AdvisorySource, release: string, cveId: string): string =>
  `cve:${source}:${releaseToken(release)}:${cveId}`;

export const advisoryKnowledgeId = (
  source: AdvisorySource,
  release: string,
  advisoryId: string
): string => `adv:${source}:${releaseToken(release)}:${advisoryId}`;
