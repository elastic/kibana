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

/** How much of a following block taller than a page must fit beside a keep-with-next block. */
const KEEP_WITH_NEXT_MIN_HEIGHT = 140;

/** Minimum free share of a page needed to start a taller-than-page block on it. */
const MIN_SLICE_START_SPACE = 0.35;

/** A block up to this many pages tall is shrunk to fit one page instead of being sliced. */
const MAX_FIT_PAGES = 1.3;

/** Room left above a shrunk block for a preceding heading. */
const FIT_HEADING_RESERVE = 70;

/**
 * Uniform scale (<= 1) that shrinks a slightly-too-tall block to fit one page, so it is not cut
 * mid-content. Returns 1 for blocks that already fit or are far too tall (those are sliced).
 */
export const fitScaleForTallBlock = (
  height: number,
  pageHeight: number = USABLE_PAGE_HEIGHT
): number =>
  height > pageHeight && height <= pageHeight * MAX_FIT_PAGES
    ? (pageHeight - FIT_HEADING_RESERVE) / height
    : 1;

/** A captured block, already scaled to the page width. */
export interface FlowBlock {
  id: string;
  /** Scaled height in points. */
  height: number;
  /** Keep on the same page as the next block (section headings). */
  keepWithNext?: boolean;
}

/** One drawn piece of a block. A block taller than a page yields several slices. */
export interface BlockPlacement {
  blockId: string;
  /** Zero-based page index. */
  page: number;
  /** Distance from the top of the usable area to the top of this piece. */
  y: number;
  /** Distance from the top of the block to the top of this piece (0 unless sliced). */
  sliceOffset: number;
  /** Height of this piece. */
  height: number;
}

/**
 * Flows blocks top-down. A new page starts only when the next block does not fit in the space
 * left; only blocks taller than a whole page are sliced.
 */
export const flowBlocks = (
  blocks: FlowBlock[],
  pageHeight: number = USABLE_PAGE_HEIGHT,
  gap: number = BLOCK_GAP
): BlockPlacement[] => {
  const placements: BlockPlacement[] = [];
  let page = 0;
  let y = 0;

  blocks.forEach((block, index) => {
    if (block.height > pageHeight) {
      // A block taller than a page flows from where it is when enough room is left, so the page
      // is not left mostly empty; otherwise it starts on a fresh page.
      if (y > 0 && pageHeight - y < pageHeight * MIN_SLICE_START_SPACE) {
        page += 1;
        y = 0;
      }
      let offset = 0;
      while (offset < block.height) {
        const room = pageHeight - y;
        const height = Math.min(room, block.height - offset);
        placements.push({ blockId: block.id, page, y, sliceOffset: offset, height });
        offset += height;
        if (offset < block.height) {
          page += 1;
          y = 0;
        } else {
          y += height + gap;
        }
      }
      return;
    }

    const next = blocks[index + 1];
    const needed =
      block.height +
      (block.keepWithNext && next
        ? gap +
          (next.height <= pageHeight
            ? next.height
            : Math.min(next.height, KEEP_WITH_NEXT_MIN_HEIGHT))
        : 0);
    if (y > 0 && y + needed > pageHeight) {
      page += 1;
      y = 0;
    }
    placements.push({ blockId: block.id, page, y, sliceOffset: 0, height: block.height });
    y += block.height + gap;
  });

  return placements;
};
