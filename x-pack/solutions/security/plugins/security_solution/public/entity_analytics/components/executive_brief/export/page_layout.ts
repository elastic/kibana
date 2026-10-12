/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure functions for flowing captured blocks across A4 pages in a PDF.
 * All measurements in points (1 point = 1/72 inch).
 */

/** A4 page dimensions in points. */
export const A4_POINTS = {
  width: 595.28,
  height: 841.89,
};

/** Padding around content on each page. */
export const PAGE_PADDING = 20;

/** Usable area on a page (width and height minus padding). */
export const USABLE_PAGE_WIDTH = A4_POINTS.width - PAGE_PADDING * 2;
export const USABLE_PAGE_HEIGHT = A4_POINTS.height - PAGE_PADDING * 2;

/** Vertical gap between consecutive blocks on a page. */
export const BLOCK_GAP = 10;

/**
 * Smallest piece worth placing in the space left on a page: a block is only broken at a cut point
 * when at least this much room remains, and a heading needs this much of the next block beside it.
 */
export const MIN_FRAGMENT = 120;

/** Tolerance for floating-point comparisons of offsets. */
const EPSILON = 0.01;

/** A captured block, already scaled to the page width. */
export interface FlowBlock {
  id: string;
  /** Scaled height in points. */
  height: number;
  /** Keep on the same page as the next block (section headings). */
  keepWithNext?: boolean;
  /** Safe places to break the block, as scaled offsets from its top. Ascending, excluding 0. */
  cutPoints?: number[];
}

/** One drawn piece of a block. A block that is broken yields several fragments (slices). */
export interface BlockPlacement {
  blockId: string;
  /** Zero-based page index. */
  page: number;
  /** Distance from the top of the usable area to the top of this piece. */
  y: number;
  /** Distance from the top of the block to the top of this piece (0 for the first piece). */
  sliceOffset: number;
  /** Height of this piece. */
  height: number;
}

/** Largest cut point in (from, from + room], if any. */
const largestCutWithin = (
  cutPoints: readonly number[],
  from: number,
  room: number
): number | undefined => {
  let best: number | undefined;
  for (const cut of cutPoints) {
    if (cut > from + EPSILON && cut - from <= room + EPSILON) best = cut;
  }
  return best;
};

/**
 * Space the block needs at the top of a page for its first piece to be worth placing next to a
 * heading: the whole block when it has no usable cut point, else up to its first cut point that
 * leaves at least MIN_FRAGMENT.
 */
const leadingHeight = (block: FlowBlock): number => {
  const firstCut = (block.cutPoints ?? []).find((cut) => cut >= MIN_FRAGMENT);
  return Math.min(block.height, firstCut ?? block.height);
};

/**
 * Flows blocks top-down without scaling. A block that does not fit in the space left is broken at
 * its largest cut point that fits (when at least MIN_FRAGMENT is free), otherwise it moves to the
 * next page if it fits there, and only as a last resort is sliced at the page height (still
 * preferring cut points).
 */
export const flowBlocks = (
  blocks: FlowBlock[],
  pageHeight: number = USABLE_PAGE_HEIGHT,
  gap: number = BLOCK_GAP
): BlockPlacement[] => {
  const placements: BlockPlacement[] = [];
  let page = 0;
  let y = 0;

  const nextPage = () => {
    page += 1;
    y = 0;
  };

  blocks.forEach((block, index) => {
    const cutPoints = block.cutPoints ?? [];
    const next = blocks[index + 1];

    if (block.keepWithNext && next && y > 0) {
      const needed = block.height + gap + Math.min(leadingHeight(next), pageHeight);
      if (y + needed > pageHeight + EPSILON) nextPage();
    }

    let offset = 0;
    while (offset < block.height - EPSILON) {
      const remaining = block.height - offset;
      const room = pageHeight - y;

      if (remaining <= room + EPSILON) {
        placements.push({ blockId: block.id, page, y, sliceOffset: offset, height: remaining });
        y += remaining + gap;
        break;
      }

      const cut = room >= MIN_FRAGMENT ? largestCutWithin(cutPoints, offset, room) : undefined;
      if (cut !== undefined) {
        placements.push({ blockId: block.id, page, y, sliceOffset: offset, height: cut - offset });
        offset = cut;
        nextPage();
      } else if (y > 0) {
        // Nothing fits here: continue on a fresh page, where the rest may fit whole.
        nextPage();
      } else {
        // Fresh page and still too tall: break at a cut point if one fits, else slice at page height.
        const end = largestCutWithin(cutPoints, offset, pageHeight) ?? offset + pageHeight;
        placements.push({ blockId: block.id, page, y, sliceOffset: offset, height: end - offset });
        offset = end;
        nextPage();
      }
    }
  });

  return placements;
};
