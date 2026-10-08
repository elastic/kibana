/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PDFDocument as PdfDocument } from 'pdf-lib';
import type domtoimageModule from 'dom-to-image-more';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import { EXECUTIVE_BRIEF_BODY_ID, EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';
import { A4_POINTS, PAGE_PADDING, USABLE_PAGE_WIDTH } from './page_layout';

/**
 * Exports an executive brief to a PDF file.
 *
 * Strategy:
 * 1. Before capture, expand any collapsed accordions (decisions section)
 * 2. Capture each section (header, at a glance, storylines, blind spots, decisions, details) as an image
 * 3. Layout images across A4 pages using the page layout algorithm
 * 4. Create a PDF with pdf-lib and download it
 *
 * @param job - The completed executive brief job with snapshot and brief
 * @throws Error if the flyout body or section elements are not found
 */
export const exportBriefToPdf = async (job: ExecutiveBriefJob): Promise<void> => {
  // Lazy-load dependencies
  const domtoimage = (await import('dom-to-image-more')).default;
  const { PDFDocument } = await import('pdf-lib');

  const bodyElement = document.getElementById(EXECUTIVE_BRIEF_BODY_ID);
  if (!bodyElement) {
    throw new Error('Executive brief body element not found');
  }

  // Expand collapsed accordions for PDF
  expandAccordions(bodyElement);

  try {
    // Capture each section as an image
    const sectionIds = Object.values(EXECUTIVE_BRIEF_SECTION_IDS);
    const images: Array<{ id: string; blob: Blob; height: number }> = [];

    const sectionElements = sectionIds.flatMap((sectionId) => {
      const sectionElement = document.getElementById(sectionId);
      return sectionElement ? [{ sectionId, sectionElement }] : [];
    });

    for (const { sectionId, sectionElement } of sectionElements) {
      const sectionBlob = await captureSection(sectionElement, domtoimage);
      const img = new Image();
      img.src = URL.createObjectURL(sectionBlob);

      // Wait for image to load so we can get its dimensions
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      images.push({
        id: sectionId,
        blob: sectionBlob,
        height: img.naturalHeight,
      });

      URL.revokeObjectURL(img.src);
    }

    // Create PDF with images laid out across pages
    const pdfDoc = await PDFDocument.create();
    await addImagesToPdf(pdfDoc, images);

    // Download the PDF
    const pdfBytes = await pdfDoc.save();
    // Copy into an ArrayBuffer-backed view so it satisfies BlobPart.
    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    downloadBlob(pdfBlob, generateFileName());
  } finally {
    // Restore original state (collapse accordions)
    collapseAccordions(bodyElement);
  }
};

/**
 * Captures a DOM element as a PNG blob.
 * Scales 2x for better quality on screen.
 */
const captureSection = async (
  element: HTMLElement,
  domtoimage: { toBlob: (el: HTMLElement, opts?: domtoimageModule.Options) => Promise<Blob> }
): Promise<Blob> => {
  const scale = 2;
  const width = element.offsetWidth * scale;
  const height = element.offsetHeight * scale;

  const blob = await domtoimage.toBlob(element, {
    quality: 1,
    bgcolor: '#ffffff',
    cacheBust: true,
    width,
    height,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${element.offsetWidth}px`,
      height: `${element.offsetHeight}px`,
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

  return blob;
};

/**
 * Adds captured images to a PDF document, laying them out across A4 pages.
 * Each image is scaled to fit the page width. If a tall image doesn't fit on the current page,
 * it starts a new page (no splitting of individual images).
 */
const addImagesToPdf = async (
  pdfDoc: PdfDocument,
  images: Array<{ id: string; blob: Blob; height: number }>
): Promise<void> => {
  const imageUrls: Array<{ id: string; url: string; height: number }> = [];

  // Convert blobs to data URLs
  for (const { id, blob, height } of images) {
    const url = URL.createObjectURL(blob);
    imageUrls.push({ id, url, height });
  }

  try {
    let currentPage = pdfDoc.addPage([A4_POINTS.width, A4_POINTS.height]);
    let currentY = PAGE_PADDING;

    for (const { url, height: originalHeight } of imageUrls) {
      const imageBytes = await fetch(url).then((r) => r.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(imageBytes);

      const originalWidth = pngImage.width;
      const widthScale = USABLE_PAGE_WIDTH / originalWidth;
      const scaledWidth = USABLE_PAGE_WIDTH;
      const scaledHeight = originalHeight * widthScale;

      // Check if image fits on current page
      if (currentY + scaledHeight > A4_POINTS.height - PAGE_PADDING) {
        // Start new page
        currentPage = pdfDoc.addPage([A4_POINTS.width, A4_POINTS.height]);
        currentY = PAGE_PADDING;
      }

      // Draw the full image at the current position
      currentPage.drawImage(pngImage, {
        x: PAGE_PADDING,
        y: currentY,
        width: scaledWidth,
        height: scaledHeight,
      });

      currentY += scaledHeight;
    }
  } finally {
    // Clean up blob URLs
    for (const { url } of imageUrls) {
      URL.revokeObjectURL(url);
    }
  }
};

/**
 * Expands all collapsed EuiAccordions in the container by simulating clicks on their buttons.
 * EuiAccordion uses aria-expanded to track open/closed state.
 */
const expandAccordions = (container: HTMLElement): void => {
  const accordionButtons = container.querySelectorAll<HTMLElement>(
    '[id^="executiveBriefDecision"][role="button"]'
  );

  accordionButtons.forEach((button) => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    if (!isOpen) {
      button.click();
    }
  });
};

/**
 * Collapses all expanded EuiAccordions in the container by simulating clicks on their buttons.
 * Only collapses accordions that weren't originally open (those after the first decision).
 * EuiAccordion components rendered with initialIsOpen={index === 0} means only the first is open.
 */
const collapseAccordions = (container: HTMLElement): void => {
  const accordionButtons = container.querySelectorAll<HTMLElement>(
    '[id^="executiveBriefDecision"][role="button"]'
  );

  accordionButtons.forEach((button, index) => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    // Keep first accordion open (initialIsOpen={index === 0})
    if (isOpen && index > 0) {
      button.click();
    }
  });
};

/**
 * Downloads a blob as a file.
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Generates a filename for the exported PDF.
 */
const generateFileName = (): string => {
  const date = new Date();
  const isoString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `executive-brief-${isoString}.pdf`;
};
