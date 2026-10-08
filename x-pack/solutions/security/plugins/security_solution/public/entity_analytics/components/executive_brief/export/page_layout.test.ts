/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PAGE_PADDING,
  USABLE_PAGE_WIDTH,
  layoutSectionsOnPages,
  type Section,
} from './page_layout';

describe('page_layout', () => {
  describe('layoutSectionsOnPages', () => {
    const createSection = (id: string, height: number): Section => ({
      id,
      height,
      image: `data:image/png;base64,${id}`,
    });

    it('places a single small section on one page', () => {
      const sections = [createSection('section1', 200)];
      const pages = layoutSectionsOnPages(sections);

      expect(pages).toHaveLength(1);
      expect(pages[0].sections).toHaveLength(1);
      expect(pages[0].sections[0]).toEqual({
        sectionId: 'section1',
        x: PAGE_PADDING,
        y: PAGE_PADDING,
        width: USABLE_PAGE_WIDTH,
        height: 200,
      });
    });

    it('places multiple small sections on one page', () => {
      const sections = [
        createSection('header', 100),
        createSection('glance', 150),
        createSection('storylines', 200),
      ];
      const pages = layoutSectionsOnPages(sections);

      expect(pages).toHaveLength(1);
      expect(pages[0].sections).toHaveLength(3);
      expect(pages[0].sections[0].y).toBe(PAGE_PADDING);
      expect(pages[0].sections[1].y).toBe(PAGE_PADDING + 100);
      expect(pages[0].sections[2].y).toBe(PAGE_PADDING + 250);
    });

    it('splits sections across pages when they exceed page height', () => {
      const pageHeight = 300;
      const sections = [
        createSection('section1', 200),
        createSection('section2', 250), // doesn't fit on page 1
      ];
      const pages = layoutSectionsOnPages(sections, pageHeight);

      expect(pages).toHaveLength(2);
      expect(pages[0].sections).toHaveLength(1);
      expect(pages[0].sections[0].sectionId).toBe('section1');
      expect(pages[1].sections).toHaveLength(1);
      expect(pages[1].sections[0].sectionId).toBe('section2');
    });

    it('splits a single tall section across multiple pages', () => {
      const pageHeight = 300;
      const sections = [createSection('tall', 700)];
      const pages = layoutSectionsOnPages(sections, pageHeight);

      expect(pages).toHaveLength(3);
      pages.forEach((page) => {
        expect(page.sections).toHaveLength(1);
        expect(page.sections[0].sectionId).toBe('tall');
        expect(page.sections[0].height).toBeLessThanOrEqual(pageHeight);
      });
    });

    it('returns empty array for empty sections', () => {
      const pages = layoutSectionsOnPages([]);
      expect(pages).toHaveLength(0);
    });

    it('positions sections at PAGE_PADDING from left edge', () => {
      const sections = [createSection('section1', 100)];
      const pages = layoutSectionsOnPages(sections);

      expect(pages[0].sections[0].x).toBe(PAGE_PADDING);
    });

    it('scales sections to fit page width', () => {
      const sections = [createSection('section1', 100)];
      const pages = layoutSectionsOnPages(sections);

      expect(pages[0].sections[0].width).toBe(USABLE_PAGE_WIDTH);
    });

    it('handles mix of small and large sections', () => {
      const pageHeight = 300;
      const sections = [
        createSection('small1', 100),
        createSection('tall', 400),
        createSection('small2', 100),
      ];
      const pages = layoutSectionsOnPages(sections, pageHeight);

      expect(pages.length).toBeGreaterThanOrEqual(3);
      // Verify sections are in order across pages
      const allSections = pages.flatMap((p) => p.sections.map((s) => s.sectionId));
      expect(allSections[0]).toBe('small1');
      expect(allSections[1]).toBe('tall');
      expect(allSections[allSections.length - 1]).toBe('small2');
    });
  });
});
