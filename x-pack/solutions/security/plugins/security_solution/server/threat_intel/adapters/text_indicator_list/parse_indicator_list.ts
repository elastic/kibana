/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedIoc } from '../../services/extract_iocs';
import { extractIocs } from '../../services/extract_iocs';

/**
 * Tiers the extractor has already judged not to be indicators. These are never
 * elevated, whatever list they appear on.
 */
const NON_ELEVATABLE_TIERS: ReadonlySet<string> = new Set(['reference', 'denied']);

// Hosts that are link-only and not worth ingesting as threat content.
// The router may refine this list later; fail toward 'candidate' on unknowns.
const SOCIAL_HOSTS = new Set([
  'twitter.com',
  'x.com',
  't.me',
  'pastebin.com',
  'bit.ly',
  'ghostbin.com',
  't.co',
  'tinyurl.com',
  'facebook.com',
  'reddit.com',
  'youtube.com',
]);

export interface IndicatorBlock {
  reference?: string;
  reference_class?: 'social' | 'candidate';
  block_index: number;
  iocs: ExtractedIoc[];
}

/**
 * Classifies a reference URL as 'social' (link-only, not worth ingesting) or
 * 'candidate' (potentially rich source content). Malformed URLs → 'candidate'.
 */
export const classifyReference = (url: string): 'social' | 'candidate' => {
  try {
    const { hostname } = new URL(url);
    const lower = hostname.toLowerCase();
    // Check exact match or subdomain match
    for (const host of SOCIAL_HOSTS) {
      if (lower === host || lower.endsWith(`.${host}`)) {
        return 'social';
      }
    }
    return 'candidate';
  } catch {
    return 'candidate';
  }
};

const REFERENCE_PREFIX = '# Reference:';

/**
 * Parses a Maltrail-format indicator list body into blocks, each block grouping
 * IOCs under the nearest preceding # Reference: line.
 *
 * - Skips all other # comment lines (copyright, license, blank comments).
 * - Uses extractIocs for value classification; never reinvents IOC parsing.
 * - Stamps every IOC with tier_basis 'maltrail_indicator_list' and tier 'discriminating'.
 * - Tolerant: blank lines and unrecognised lines are silently skipped.
 */
export const parseIndicatorList = (body: string): IndicatorBlock[] => {
  if (!body || !body.trim()) {
    return [];
  }

  const blocks: IndicatorBlock[] = [];
  let currentBlock: IndicatorBlock = { block_index: 0, iocs: [] };
  let seenFirstReference = false;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith(REFERENCE_PREFIX)) {
      const url = line.slice(REFERENCE_PREFIX.length).trim();

      if (currentBlock.iocs.length > 0 || seenFirstReference) {
        blocks.push(currentBlock);
        currentBlock = {
          block_index: currentBlock.block_index + 1,
          iocs: [],
        };
      }

      seenFirstReference = true;
      currentBlock.reference = url;
      currentBlock.reference_class = classifyReference(url);
    } else if (line && !line.startsWith('#')) {
      const { iocs } = extractIocs({ text: line, defang: false });
      for (const ioc of iocs) {
        // Appearing in a curated trail file is a strong signal, so an uncertain or
        // contextual value is elevated. It is not strong enough to override a
        // verdict the extractor already reached: `reference` covers private and
        // reserved addresses and security-vendor and research domains, `denied` is
        // the benign denylist, and the promote task admits everything that is not
        // one of those two. Blanket-elevating turned 10.0.0.1 and virustotal.com
        // into live Indicator Match rows.
        currentBlock.iocs.push(
          NON_ELEVATABLE_TIERS.has(ioc.tier)
            ? ioc
            : {
                ...ioc,
                tier: 'discriminating',
                tier_heuristic: 'discriminating',
                tier_basis: 'maltrail_indicator_list',
              }
        );
      }
    }
    // blank lines and non-reference # comments: fall through (no-op)
  }

  if (currentBlock.iocs.length > 0 || seenFirstReference) {
    blocks.push(currentBlock);
  }

  return blocks;
};
