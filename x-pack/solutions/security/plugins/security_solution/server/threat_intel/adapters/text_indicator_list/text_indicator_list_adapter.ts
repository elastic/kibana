/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_SPACE_ID } from '../../../../common/threat_intel';
import { fetchUrlForContext, redactUrl } from '../http_client';
import { buildFingerprint } from '../fingerprint';
import { DEFAULT_SEVERITY_LEVEL, DEFAULT_SEVERITY_SCORE } from '../../services/severity';
import { buildReportContent } from '../../services/report_content';
import type { AdapterRunContext, FetchAdapter, NormalizedReport, SourceHit } from '../types';
import { canonicalizeUrl } from './canonicalize_url';
import { parseIndicatorList } from './parse_indicator_list';
import type { IndicatorBlock } from './parse_indicator_list';

const SOURCE_DOC_REF_INDEX = 'maltrail:trail';

// ES default is 10k nested objects per doc (sum of ALL nested types). We target ≤5k to leave
// headroom for content.external_references entries that also count toward the limit.
const MAX_NESTED_PER_DOC = 5000;

const readTrailUrl = (source: SourceHit): string | undefined => {
  const url = source._source.config.url;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
};

/** Extract the filename stem from a URL path (e.g. `.../malware/cobaltstrike.txt` → `cobaltstrike`). */
const trailLabelFromUrl = (url: string): string => {
  try {
    const { pathname } = new URL(url);
    const filename = pathname.split('/').pop() ?? '';
    return filename.replace(/\.[^.]+$/, '') || 'unknown';
  } catch {
    return 'unknown';
  }
};

type IocEntry = NonNullable<NonNullable<NormalizedReport['extracted']>['iocs']>[number];
type ExtRefEntry = NonNullable<NormalizedReport['content']['external_references']>[number];

/**
 * Partition a flat IOC list and its associated blocks into chunks that each stay under
 * MAX_NESTED_PER_DOC total nested objects (iocs + external_references).
 *
 * Strategy:
 * 1. Trail-wide IOC dedup (type:value, first block wins) happens BEFORE chunking — a value
 *    repeated across blocks is emitted once total, not once per chunk.
 * 2. Group whole `# Reference:` blocks together until adding the next block would exceed the
 *    bound. Then start a new chunk.
 * 3. Within-block split: if a SINGLE block's IOC count alone exceeds the bound, split it across
 *    multiple fragment chunks. Each fragment's external_references entry for that reference carries
 *    ref_part (1-based) and ref_part_count (total fragments for THIS reference). Both are always
 *    stamped — unsplit references get 1/1.
 * 4. A chunk may hold the tail fragment of reference R and the first fragment of reference S, so
 *    both m/n values are correct independently on their own external_references entries.
 */
const chunkBlocks = (
  blocks: IndicatorBlock[],
  dedupedIocs: Map<string, IocEntry>
): Array<{
  iocs: IocEntry[];
  refEntries: ExtRefEntry[];
}> => {
  // Build a lookup: block_index → deduped IOCs that belong to that block.
  const iocsByBlock = new Map<number, IocEntry[]>();
  for (const ioc of dedupedIocs.values()) {
    const bi = ioc.block_index ?? 0;
    const arr = iocsByBlock.get(bi);
    if (arr) {
      arr.push(ioc);
    } else {
      iocsByBlock.set(bi, [ioc]);
    }
  }

  const chunks: Array<{ iocs: IocEntry[]; refEntries: ExtRefEntry[] }> = [];
  let currentIocs: IocEntry[] = [];
  let currentRefs: ExtRefEntry[] = [];
  // Per-chunk ref URL dedup: same URL in two different blocks doesn't produce two ref entries
  // in one doc. Reset on flush so cross-chunk fragments of the same URL each get their own entry.
  let currentRefUrls = new Set<string>();

  const flush = () => {
    if (currentIocs.length > 0 || currentRefs.length > 0) {
      chunks.push({ iocs: currentIocs, refEntries: currentRefs });
      currentIocs = [];
      currentRefs = [];
      currentRefUrls = new Set();
    }
  };

  const nestedInCurrent = () => currentIocs.length + currentRefs.length;

  // Helper: push a ref entry into the current chunk, respecting within-chunk URL dedup.
  // A ref URL already seen in this chunk does not get a second entry.
  // Returns the number of nested slots consumed (0 if URL was already present, 1 otherwise).
  const pushRef = (entry: ExtRefEntry): number => {
    const key = entry.url ?? '';
    if (currentRefUrls.has(key)) {
      return 0;
    }
    currentRefUrls.add(key);
    currentRefs.push(entry);
    return 1;
  };

  const buildRefEntry = (block: IndicatorBlock, part: number, partCount: number): ExtRefEntry => {
    const canonical = block.reference ? canonicalizeUrl(block.reference) : undefined;
    return {
      source_name: 'maltrail',
      url: block.reference,
      ...(block.reference_class !== undefined ? { description: block.reference_class } : {}),
      ...(canonical !== undefined ? { canonical_url: canonical } : {}),
      ref_part: part,
      ref_part_count: partCount,
    };
  };

  for (const block of blocks) {
    const blockIocs = iocsByBlock.get(block.block_index) ?? [];
    const hasRef = block.reference !== undefined;

    if (blockIocs.length === 0 && !hasRef) {
      // Empty block with no reference — nothing to emit.
    } else if (blockIocs.length === 0) {
      // Reference-only block (no surviving IOCs after dedup). Add the ref entry alone.
      // Cost of a new ref entry in the current chunk (0 if URL already seen here).
      const refCostInCurrent = !currentRefUrls.has(block.reference ?? '') ? 1 : 0;
      if (nestedInCurrent() + refCostInCurrent > MAX_NESTED_PER_DOC) {
        flush();
      }
      pushRef(buildRefEntry(block, 1, 1));
    } else {
      // Cost of a new ref entry in the current chunk (0 if URL already seen here).
      const refCostInCurrent = hasRef && !currentRefUrls.has(block.reference ?? '') ? 1 : 0;
      // Cost to add this block whole to the current chunk.
      const blockCostInCurrent = blockIocs.length + refCostInCurrent;
      // Cost to add this block whole to a fresh chunk (ref URL is always new after flush).
      const blockCostFresh = blockIocs.length + (hasRef ? 1 : 0);

      if (
        blockCostInCurrent <= MAX_NESTED_PER_DOC &&
        nestedInCurrent() + blockCostInCurrent <= MAX_NESTED_PER_DOC
      ) {
        // Whole block fits in the current chunk.
        if (hasRef) {
          pushRef(buildRefEntry(block, 1, 1));
        }
        currentIocs.push(...blockIocs);
      } else if (blockCostFresh <= MAX_NESTED_PER_DOC) {
        // Block fits whole but not in the current chunk — start a new chunk.
        flush();
        if (hasRef) {
          pushRef(buildRefEntry(block, 1, 1));
        }
        currentIocs.push(...blockIocs);
      } else {
        // Within-block split: the block alone exceeds MAX_NESTED_PER_DOC. Split the IOC slice
        // across multiple fragment docs. Each fragment's ref entry carries ref_part / ref_part_count.
        const iocBudgetPerFragment = MAX_NESTED_PER_DOC - (hasRef ? 1 : 0);
        const refPartCount = Math.ceil(blockIocs.length / iocBudgetPerFragment);

        for (let part = 1; part <= refPartCount; part++) {
          const slice = blockIocs.slice(
            (part - 1) * iocBudgetPerFragment,
            part * iocBudgetPerFragment
          );

          // Each split fragment always gets its own chunk so ref_part is unambiguous.
          // Flush before each fragment (the ref URL is fresh after flush).
          flush();

          if (hasRef) {
            pushRef(buildRefEntry(block, part, refPartCount));
          }
          currentIocs.push(...slice);
        }
      }
    }
  }

  flush();
  return chunks;
};

export const textIndicatorListAdapter: FetchAdapter = {
  adapterType: 'text_indicator_list',
  async run(source: SourceHit, context: AdapterRunContext): Promise<NormalizedReport[]> {
    const fetchUrl = fetchUrlForContext(context);
    const log = context.logger.get('text-indicator-list-adapter');
    const url = readTrailUrl(source);
    if (!url) {
      log.warn(`Source ${source._id} has no config.url — skipping`);
      return [];
    }

    // Source URLs may embed `user:password@`, and this is the only adapter that was
    // interpolating the raw URL into its errors and log lines. The credential also
    // reached the stored `source.url`, which the promote task copies onto the
    // indicator document, so it was leaking well past the logs. Keep the raw URL
    // for the request only.
    const safeUrl = redactUrl(url);

    const response = await fetchUrl(url, {
      abortSignal: context.abortSignal,
      headers: { Accept: 'text/plain, */*' },
    });
    if (response.status >= 400) {
      throw new Error(
        `text_indicator_list fetch ${safeUrl} failed: HTTP ${response.status} ${response.statusText}`
      );
    }

    const blocks = parseIndicatorList(response.body);
    if (blocks.length === 0) {
      log.warn(`text_indicator_list at ${safeUrl} produced 0 blocks for source ${source._id}`);
      return [];
    }

    const trailLabel = trailLabelFromUrl(url);

    // Trail-wide IOC dedup by (type, value) before chunking — a value repeated across blocks
    // is emitted once total; first-block attribution wins. Dedup happens here so that an IOC
    // present in block 0 and block 5 doesn't appear in two separate chunks.
    const dedupedIocs = new Map<string, IocEntry>();
    for (const block of blocks) {
      for (const ioc of block.iocs) {
        const key = `${ioc.type}:${ioc.value}`;
        if (!dedupedIocs.has(key)) {
          dedupedIocs.set(key, {
            ...ioc,
            ...(block.reference !== undefined ? { reference: block.reference } : {}),
            block_index: block.block_index,
          });
        }
      }
    }

    if (dedupedIocs.size === 0) {
      log.warn(
        `text_indicator_list at ${safeUrl} had blocks but 0 parseable IOCs for source ${source._id}`
      );
      return [];
    }

    // Chunk into docs, each ≤ MAX_NESTED_PER_DOC total nested objects.
    const chunks = chunkBlocks(blocks, dedupedIocs);

    const ingestedAt = context.now().toISOString();
    const spaceId = source._source.space_id ?? GLOBAL_SPACE_ID;

    // Change-signal for the content fingerprint: a hash over the whole canonical
    // IOC set. This used to be body length plus the first and last IOC, which
    // collided whenever interior indicators were added, removed, replaced, or
    // reordered while those three values held — the dedup gate then skipped a
    // genuinely updated list and the indicator index went stale. Hashing the set
    // (rather than the raw body) also avoids re-ingesting on cosmetic feed
    // changes such as an updated header comment.
    const allIocs = [...dedupedIocs.values()];
    const changeSignal = buildFingerprint(
      allIocs.map((ioc) => `${ioc.type}=${ioc.value}@${ioc.reference ?? ''}`)
    );

    const reports: NormalizedReport[] = [];

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const { iocs, refEntries } = chunks[chunkIdx];

      // Per-chunk fingerprint: fold chunk index so N chunks of one trail don't collide on dedup.
      // Seeded with the redacted URL so rotating the feed credential does not
      // change the identity of every report from that feed.
      const contentFingerprint = buildFingerprint([
        safeUrl,
        trailLabel,
        changeSignal,
        String(chunkIdx),
      ]);

      const bodyText = `Maltrail indicator list: ${trailLabel} (chunk ${chunkIdx + 1}/${
        chunks.length
      }, ${iocs.length} indicators)`;
      const baseContent = buildReportContent({
        title: trailLabel,
        bodyText,
        language: 'en',
      });

      const report: NormalizedReport = {
        '@timestamp': ingestedAt,
        content_fingerprint: contentFingerprint,
        space_id: spaceId,
        source: {
          type: 'text_indicator_list',
          // The configured source name from the approved catalog entry, not the literal
          // 'maltrail'. The catalog can seed more than one text-list source, so hard-coding
          // this would misattribute every text-list feed's reports and indicators to maltrail.
          name: source._source.name,
          url: safeUrl,
          adapter_id: `text_indicator_list:${source._id}`,
        },
        content:
          refEntries.length > 0 ? { ...baseContent, external_references: refEntries } : baseContent,
        severity: {
          level: DEFAULT_SEVERITY_LEVEL,
          score: DEFAULT_SEVERITY_SCORE,
        },
        lineage: {
          ingested_at: ingestedAt,
          extraction_method: 'text_indicator_list',
          extracted_at: ingestedAt,
          source_doc_ref: { index: SOURCE_DOC_REF_INDEX, id: trailLabel },
        },
        extracted: { iocs },
      };

      reports.push(report);
    }

    log.info(
      `text_indicator_list: ${safeUrl} → ${dedupedIocs.size} deduped IOCs across ${reports.length} chunk(s) for source ${source._id}`
    );

    return reports;
  },
};
