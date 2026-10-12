/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PDFDocument as PdfDocument, PDFImage } from 'pdf-lib';
import type domtoimageModule from 'dom-to-image-more';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import {
  BRIEF_BLOCK_ATTRIBUTE,
  BRIEF_CUT_ATTRIBUTE,
  BRIEF_KEEP_WITH_NEXT_ATTRIBUTE,
} from '../constants';
import type { FlowBlock } from './page_layout';
import { A4_POINTS, PAGE_PADDING, USABLE_PAGE_WIDTH, flowBlocks } from './page_layout';

/** Called after each captured block: `done` of `total`. */
export type ExportProgressCallback = (done: number, total: number) => void;

/** Lets the browser paint and handle input between heavy synchronous steps. */
const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });

interface CapturedBlock {
  id: string;
  blob: Blob;
  keepWithNext: boolean;
  /** Rendered height of the block element in CSS px. */
  cssHeight: number;
  /** Ascending cut offsets from the block top in CSS px, excluding 0. */
  cutPointsCss: number[];
}

/**
 * Exports an executive brief to a PDF file.
 *
 * Strategy:
 * 1. The caller puts the brief in print mode first (controls hidden, decisions expanded, light
 *    theme); see the flyout. This function only captures.
 * 2. Capture every `[data-brief-block]` element (header, glance, each storyline card, blind-spot
 *    blocks, decisions, details) as its own image, in DOM order.
 * 3. Flow the images top-down across A4 pages at a constant scale, breaking blocks that do not
 *    fit at their `[data-brief-cut]` points (slicing at the page height only as a last resort).
 * 4. Create a PDF with pdf-lib and download it.
 *
 * @param job - The completed executive brief job with snapshot and brief
 * @throws Error if no capture blocks are found
 */
export const exportBriefToPdf = async (
  job: ExecutiveBriefJob,
  onProgress?: ExportProgressCallback
): Promise<void> => {
  const domtoimage = (await import('dom-to-image-more')).default;
  const { PDFDocument } = await import('pdf-lib');

  const blockElements = getTopLevelBlocks();
  if (blockElements.length === 0) {
    throw new Error('Executive brief content not found');
  }

  const captured: CapturedBlock[] = [];
  onProgress?.(0, blockElements.length);
  for (const [index, element] of blockElements.entries()) {
    const blob = await captureBlock(element, domtoimage);
    await yieldToBrowser();
    onProgress?.(index + 1, blockElements.length);
    const { cssHeight, cutPointsCss } = measureCutPoints(element);
    captured.push({
      id: `${element.getAttribute(BRIEF_BLOCK_ATTRIBUTE) ?? 'block'}-${index}`,
      blob,
      keepWithNext: element.hasAttribute(BRIEF_KEEP_WITH_NEXT_ATTRIBUTE),
      cssHeight,
      cutPointsCss,
    });
  }

  const pdfDoc = await PDFDocument.create();
  await addBlocksToPdf(pdfDoc, captured);

  const pdfBytes = await pdfDoc.save();
  // Copy into an ArrayBuffer-backed view so it satisfies BlobPart.
  const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  downloadBlob(pdfBlob, generateFileName(job));
};

/** Capture blocks in DOM order; a block nested in another block is part of its parent. */
const getTopLevelBlocks = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[${BRIEF_BLOCK_ATTRIBUTE}]`)).filter(
    (element) => !element.parentElement?.closest(`[${BRIEF_BLOCK_ATTRIBUTE}]`)
  );

/** Offsets of the `[data-brief-cut]` descendants from the block top, in CSS px, ascending. */
const measureCutPoints = (element: HTMLElement): { cssHeight: number; cutPointsCss: number[] } => {
  const blockRect = element.getBoundingClientRect();
  const offsets = Array.from(element.querySelectorAll<HTMLElement>(`[${BRIEF_CUT_ATTRIBUTE}]`))
    .filter((cut) => shouldCaptureNode(cut))
    .map((cut) => Math.round((cut.getBoundingClientRect().top - blockRect.top) * 10) / 10)
    .filter((offset) => offset > 1 && offset < blockRect.height - 1);
  return {
    cssHeight: blockRect.height,
    cutPointsCss: Array.from(new Set(offsets)).sort((a, b) => a - b),
  };
};

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

/** Skips nodes that cannot render (hidden, print-hidden, non-visual) so they are not cloned. */
const shouldCaptureNode = (node: Node): boolean => {
  if (!(node instanceof HTMLElement)) return true;
  return !(
    SKIPPED_TAGS.has(node.tagName) ||
    node.hidden ||
    node.style.display === 'none' ||
    node.hasAttribute('data-print-hide')
  );
};

/** Captures a DOM element as a PNG blob, at most 1.5x for quality versus cost. */
const captureBlock = async (
  element: HTMLElement,
  domtoimage: { toBlob: (el: HTMLElement, opts?: domtoimageModule.Options) => Promise<Blob> }
): Promise<Blob> => {
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  const { offsetWidth, offsetHeight } = element;

  return domtoimage.toBlob(element, {
    quality: 1,
    bgcolor: '#ffffff',
    cacheBust: true,
    filter: shouldCaptureNode,
    width: offsetWidth * scale,
    height: offsetHeight * scale,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${offsetWidth}px`,
      height: `${offsetHeight}px`,
    },
    styleFilter: (style: CSSStyleSheet) => {
      try {
        void style.cssRules;
        return true;
      } catch {
        return false;
      }
    },
  });
};

/** Embeds the captured blocks and draws them onto pages using the flow layout. */
const addBlocksToPdf = async (pdfDoc: PdfDocument, blocks: CapturedBlock[]): Promise<void> => {
  // Already loaded by exportBriefToPdf, so this resolves from the module cache.
  const { pushGraphicsState, popGraphicsState, rectangle, clip, endPath } = await import('pdf-lib');
  const embedded: Array<{
    id: string;
    image: PDFImage;
    scaledWidth: number;
    scaledHeight: number;
  }> = [];
  const flowInput: FlowBlock[] = [];
  for (const { id, blob, keepWithNext, cssHeight, cutPointsCss } of blocks) {
    const image = await pdfDoc.embedPng(await blob.arrayBuffer());
    await yieldToBrowser();
    const scaledHeight = image.height * (USABLE_PAGE_WIDTH / image.width);
    const pointsPerCssPx = cssHeight > 0 ? scaledHeight / cssHeight : 0;
    embedded.push({ id, image, scaledWidth: USABLE_PAGE_WIDTH, scaledHeight });
    flowInput.push({
      id,
      height: scaledHeight,
      keepWithNext,
      cutPoints: cutPointsCss.map((cut) => cut * pointsPerCssPx),
    });
  }

  const placements = flowBlocks(flowInput);

  const pageTop = A4_POINTS.height - PAGE_PADDING;
  const pages: Array<ReturnType<PdfDocument['addPage']>> = [];
  const getPage = (index: number) => {
    while (pages.length <= index) {
      pages.push(pdfDoc.addPage([A4_POINTS.width, A4_POINTS.height]));
    }
    return pages[index];
  };

  for (const { blockId, page, y, sliceOffset, height } of placements) {
    const block = embedded.find(({ id }) => id === blockId);
    if (!block) {
      throw new Error(`Captured block ${blockId} not found`);
    }
    const pdfPage = getPage(page);
    // pdf-lib's origin is bottom-left: the block's top sits `sliceOffset` above this piece's top.
    // Clip to the piece so neighbouring parts of the image do not show above or below it.
    pdfPage.pushOperators(
      pushGraphicsState(),
      rectangle(PAGE_PADDING, pageTop - y - height, block.scaledWidth, height),
      clip(),
      endPath()
    );
    pdfPage.drawImage(block.image, {
      x: PAGE_PADDING,
      y: pageTop - y - block.scaledHeight + sliceOffset,
      width: block.scaledWidth,
      height: block.scaledHeight,
    });
    pdfPage.pushOperators(popGraphicsState());
  }
};

/** Downloads a blob as a file. */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const generateFileName = (job: ExecutiveBriefJob): string => {
  const isoDate = new Date(job.snapshot?.generatedAt ?? Date.now()).toISOString().split('T')[0];
  return `executive-brief-${isoDate}.pdf`;
};
