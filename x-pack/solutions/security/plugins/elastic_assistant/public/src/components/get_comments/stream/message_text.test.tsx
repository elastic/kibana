/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageText } from './message_text';

const LONG_CELL_TEXT =
  'Copying files to a hidden volume is a classic staging behavior that is later used to move data to other systems or to exfiltrate it';

const defaultProps = {
  content: `| Element | Description |\n| --- | --- |\n| Why | ${LONG_CELL_TEXT} |`,
  contentReferences: undefined,
  contentReferencesVisible: false,
  contentReferencesDisabled: true,
  index: 0,
  loading: false,
};

describe('MessageText', () => {
  describe('markdown tables', () => {
    it('renders the full cell text without truncating it', () => {
      render(<MessageText {...defaultProps} />);

      const cellContent = screen.getByText(LONG_CELL_TEXT).closest('.euiTableCellContent');

      expect(cellContent).not.toBeNull();
      expect(cellContent?.className).not.toMatch(/truncateText/);
    });

    it('bounds the width of header and body cells so long text wraps', () => {
      render(<MessageText {...defaultProps} />);

      const cells = [
        screen.getByText('Description').closest('th'),
        screen.getByText(LONG_CELL_TEXT).closest('td'),
      ];

      cells.forEach((cell) => {
        expect(cell).toHaveStyle({ minWidth: '10em', maxWidth: '30em' });
      });
    });

    it('lets wide tables scroll horizontally within their own wrapper', () => {
      render(<MessageText {...defaultProps} />);

      const table = screen.getByRole('table');

      expect(table.parentElement?.className).toMatch(/scrollableWrapper/);
    });
  });
});
