/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  flushLastRowStyles,
  hiddenColumnHeaderStyles,
  oneLineCellStyles,
  truncatedDescriptionStyles,
} from './table_styles';

/**
 * These are three serialized emotion styles rather than functions, so the only thing worth asserting
 * is the set of measured traps their docstrings name — each of which looks correct in review and does
 * nothing in a browser.
 *
 * Emotion strips whitespace when it serializes, so the expected substrings are declaration-minified
 * (`border-block-end:none`, not `border-block-end: none`).
 */
describe('table_styles', () => {
  describe('flushLastRowStyles', () => {
    it('clears the logical border EUI actually sets on a cell', () => {
      expect(flushLastRowStyles.styles).toContain('border-block-end:none');
    });

    /** `border-bottom` is the intuitive spelling and has no effect: EUI styles cells with `border-block`. */
    it('does not reach for border-bottom, which EUI never sets', () => {
      expect(flushLastRowStyles.styles).not.toContain('border-bottom');
    });

    it('targets only the last row, so the rules between rows survive', () => {
      expect(flushLastRowStyles.styles).toContain('.euiTableRow:last-child');
    });
  });

  describe('truncatedDescriptionStyles', () => {
    it('needs all three declarations to ellipsise a single line', () => {
      expect([
        truncatedDescriptionStyles.styles.includes('white-space:nowrap'),
        truncatedDescriptionStyles.styles.includes('overflow:hidden'),
        truncatedDescriptionStyles.styles.includes('text-overflow:ellipsis'),
      ]).toEqual([true, true, true]);
    });
  });

  describe('hiddenColumnHeaderStyles', () => {
    it('hides the header row', () => {
      expect(hiddenColumnHeaderStyles.styles).toContain('thead{display:none;}');
    });

    /**
     * Without this the panel's own top border and EUI's first-cell border stack into a double rule,
     * which is only visible once the `thead` that used to sit between them is gone.
     */
    it("also clears the first row's top border, which the header used to hide", () => {
      expect(hiddenColumnHeaderStyles.styles).toContain('.euiTableRow:first-child');
      expect(hiddenColumnHeaderStyles.styles).toContain('border-block-start:none');
    });

    /** Same trap as `flushLastRowStyles`: EUI never sets the physical property. */
    it('does not reach for border-top, which EUI never sets', () => {
      expect(hiddenColumnHeaderStyles.styles).not.toContain('border-top');
    });
  });

  describe('oneLineCellStyles', () => {
    /** Without the min-width reset a flex child refuses to shrink below its content, so nothing truncates. */
    it('lets a cell child shrink below its content width', () => {
      expect(oneLineCellStyles.styles).toContain('min-width:0');
    });
  });
});
