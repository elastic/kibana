/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure functions for laying out sections across A4 pages in a PDF.
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

/** A section to be rendered on a page. */
export interface Section {
  id: string;
  height: number; // in points
  image: string; // data URL or blob URL
}

/** A page containing one or more sections. */
export interface PageLayout {
  sections: Array<{ sectionId: string; x: number; y: number; width: number; height: number }>;
}

/**
 * Layouts sections across multiple A4 pages.
 *
 * @param sections - Sections to layout, in order
 * @param pageHeight - Usable height per page (default: USABLE_PAGE_HEIGHT)
 * @returns Array of pages, each describing its sections
 *
 * Strategy:
 * - Each section is scaled to fit the page width
 * - Sections are placed top-to-bottom, left-aligned
 * - If a section doesn't fit on the current page, start a new page
 * - Sections that are taller than a page are split across multiple pages (each slice is page-height)
 */
export const layoutSectionsOnPages = (
  sections: Section[],
  pageHeight: number = USABLE_PAGE_HEIGHT
): PageLayout[] => {
  const pages: PageLayout[] = [];
  let currentPage: PageLayout['sections'] = [];
  let currentPageYOffset = 0;

  for (const section of sections) {
    const scaledWidth = USABLE_PAGE_WIDTH;
    const scaledHeight = (section.height / section.height) * section.height; // maintain aspect ratio

    // If section is taller than a page, split it
    if (scaledHeight > pageHeight) {
      const slicesNeeded = Math.ceil(scaledHeight / pageHeight);

      for (let i = 0; i < slicesNeeded; i++) {
        const sliceHeight = Math.min(pageHeight, scaledHeight - i * pageHeight);

        currentPage.push({
          sectionId: section.id,
          x: PAGE_PADDING,
          y: PAGE_PADDING,
          width: scaledWidth,
          height: sliceHeight,
        });

        pages.push({ sections: currentPage });
        currentPage = [];
        currentPageYOffset = 0;
      }
    } else if (currentPageYOffset + scaledHeight > pageHeight) {
      // Section doesn't fit on current page; start a new one
      pages.push({ sections: currentPage });
      currentPage = [
        {
          sectionId: section.id,
          x: PAGE_PADDING,
          y: PAGE_PADDING,
          width: scaledWidth,
          height: scaledHeight,
        },
      ];
      currentPageYOffset = scaledHeight;
    } else {
      // Section fits on current page
      currentPage.push({
        sectionId: section.id,
        x: PAGE_PADDING,
        y: PAGE_PADDING + currentPageYOffset,
        width: scaledWidth,
        height: scaledHeight,
      });
      currentPageYOffset += scaledHeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push({ sections: currentPage });
  }

  return pages.length > 0 ? pages : [];
};
