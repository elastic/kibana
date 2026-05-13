/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { IOC_TYPES, type IocType } from '../../common';

/**
 * Domain capability module for the `extract_iocs` action.
 *
 * Pure (no I/O) — same regex set used by Workflow 2 during automated
 * ingestion as well as by the agent-builder tool wrapper and the internal
 * HTTP route. Designed to favor precision over recall; the LLM-driven
 * `hunt_behavior` flow does the deeper pass.
 */

export interface ExtractIocsParams {
  text: string;
  defang?: boolean;
}

export interface ExtractedIoc {
  type: IocType;
  value: string;
  defanged?: string;
}

export interface ExtractIocsResult {
  count: number;
  iocs: ExtractedIoc[];
  ioc_set_hash: string | null;
}

const PATTERNS: Record<IocType, RegExp> = {
  hash: /\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi,
  // IPv4 dotted quad with octet bounds; IPv6 left out for now (false-positive prone).
  ip: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g,
  // Domain: 2+ labels, last label 2+ alpha chars. Filters obvious filenames.
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi,
  url: /\bhttps?:\/\/[^\s<>"']{4,}/gi,
};

const PRIVATE_IP_PREFIXES = ['10.', '127.', '169.254.', '192.168.'];
const COMMON_NOISE_DOMAINS = new Set([
  'example.com',
  'localhost',
  'github.com',
  'twitter.com',
  'mitre.org',
  'attack.mitre.org',
  'nvd.nist.gov',
  'cve.mitre.org',
]);

const isPrivateIp = (ip: string) => PRIVATE_IP_PREFIXES.some((p) => ip.startsWith(p));

const defangValue = (type: IocType, value: string, shouldDefang: boolean): string => {
  if (!shouldDefang) return value;
  if (type === 'ip' || type === 'domain') return value.replace(/\./g, '[.]');
  if (type === 'url') return value.replace(/^https?:\/\//, (m) => m.replace(/:\/\//, '[:]//'));
  return value;
};

export const extractIocs = ({ text, defang = true }: ExtractIocsParams): ExtractIocsResult => {
  const seen = new Set<string>();
  const iocs: ExtractedIoc[] = [];

  for (const type of IOC_TYPES) {
    const matches = text.match(PATTERNS[type]) ?? [];
    for (const raw of matches) {
      const value = type === 'hash' ? raw.toLowerCase() : raw;
      const dedupKey = `${type}:${value.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      if (type === 'ip' && isPrivateIp(value)) continue;
      if (type === 'domain' && COMMON_NOISE_DOMAINS.has(value.toLowerCase())) continue;
      seen.add(dedupKey);
      iocs.push({ type, value, defanged: defangValue(type, value, defang) });
    }
  }

  // Sorted-set fingerprint of the unique IOC values in this report. Workflow 2
  // persists this to `extracted.ioc_set_hash` and uses it to find other reports
  // with overlapping infrastructure. Type-agnostic on purpose so the same IP
  // surfacing under different normalization conventions still matches.
  const iocSetHash =
    iocs.length === 0
      ? null
      : createHash('sha256')
          .update(
            iocs
              .map((ioc) => `${ioc.type}:${ioc.value.toLowerCase()}`)
              .sort()
              .join('\n')
          )
          .digest('hex');

  return {
    count: iocs.length,
    iocs,
    ioc_set_hash: iocSetHash,
  };
};
