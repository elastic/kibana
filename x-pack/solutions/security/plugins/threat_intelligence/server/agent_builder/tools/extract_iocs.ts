/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { IOC_TYPES, THREAT_INTEL_TOOL_IDS } from '../../../common';

const extractIocsSchema = z.object({
  text: z.string().min(1).describe('Free-form text to scan for IOCs.'),
  defang: z
    .boolean()
    .optional()
    .default(true)
    .describe('Return values in defanged form (e.g. "evil[.]com", "192[.]168[.]1[.]1").'),
});

/**
 * Conservative regexes — designed to favor precision over recall.
 * The LLM-driven `hunt_behavior` tool can do a deeper pass; this one
 * is fast and zero-cost so Workflow 2 can call it on every ingested
 * document.
 */
const PATTERNS: Record<(typeof IOC_TYPES)[number], RegExp> = {
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

const defangValue = (
  type: (typeof IOC_TYPES)[number],
  value: string,
  shouldDefang: boolean
): string => {
  if (!shouldDefang) return value;
  if (type === 'ip' || type === 'domain') return value.replace(/\./g, '[.]');
  if (type === 'url') return value.replace(/^https?:\/\//, (m) => m.replace(/:\/\//, '[:]//'));
  return value;
};

export const extractIocsTool: BuiltinToolDefinition<typeof extractIocsSchema> = {
  id: THREAT_INTEL_TOOL_IDS.extractIocs,
  type: ToolType.builtin,
  description:
    'Extract IOCs (hashes, IPs, domains, URLs) from a block of text using conservative regexes. ' +
    'Used by Workflow 2 during automated ingestion. Not exposed inline in the skill — the ' +
    'orchestrating agent should prefer `threat_intel.hunt_behavior` for richer extraction.',
  schema: extractIocsSchema,
  tags: ['threat-intel', 'ioc-extraction'],
  handler: async ({ text, defang }) => {
    const seen = new Set<string>();
    const iocs: Array<{
      type: (typeof IOC_TYPES)[number];
      value: string;
      defanged?: string;
    }> = [];

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
    // with overlapping infrastructure ("shares N IOCs with TL-…"). The hash is
    // type-agnostic on purpose — we want to catch the case where the same IP
    // surfaces in two reports under different normalization conventions.
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
      results: [
        {
          type: ToolResultType.other,
          data: {
            count: iocs.length,
            iocs,
            ioc_set_hash: iocSetHash,
          },
        },
      ],
    };
  },
};
