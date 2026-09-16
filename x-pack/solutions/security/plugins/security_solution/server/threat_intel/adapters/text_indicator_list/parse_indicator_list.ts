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

export interface IndicatorBlock {
  reference?: string;
  block_index: number;
  iocs: ExtractedIoc[];
}

const REFERENCE_PREFIX = '# Reference:';

/** Default provenance stamp, kept for the Maltrail trail sources in the catalog. */
export const DEFAULT_INDICATOR_LIST_TIER_BASIS = 'maltrail_indicator_list';

/**
 * Parses a Maltrail-format indicator list body into blocks, each block grouping
 * IOCs under the nearest preceding # Reference: line.
 *
 * - Skips all other # comment lines (copyright, license, blank comments).
 * - Uses extractIocs for value classification; never reinvents IOC parsing.
 * - Stamps every elevated IOC with `tierBasis` and tier 'discriminating'.
 * - Tolerant: blank lines and unrecognised lines are silently skipped.
 *
 * `tierBasis` is a parameter because this parser is the generic
 * `text_indicator_list` reader, and `tier_basis` flows through to indicator
 * documents and detection rules. A second, non-Maltrail text list would
 * otherwise be stamped with the wrong provenance.
 */
export const parseIndicatorList = (
  body: string,
  tierBasis: string = DEFAULT_INDICATOR_LIST_TIER_BASIS
): IndicatorBlock[] => {
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
                tier_basis: tierBasis,
              }
        );
      }
    }
  }

  if (currentBlock.iocs.length > 0 || seenFirstReference) {
    blocks.push(currentBlock);
  }

  return blocks;
};
