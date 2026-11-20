/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../../test/test_provider';
import { columns } from './overview_tab';
import { TruncatedCopyableText } from './findings_right/header';

const renderValueCell = (value: string[]) => {
  const column = columns[1];
  if (!column || !('render' in column) || !column.render) throw new Error('missing render');
  return render(<TestProvider>{column.render(value as unknown as string, {})}</TestProvider>);
};

describe('copy buttons', () => {
  beforeEach(() => {
    document.execCommand = jest.fn(() => true);
  });

  it.each([['{enter}'], [' ']])(
    'TruncatedCopyableText copy button is reachable by Tab and copies with %j',
    async (key) => {
      render(<TruncatedCopyableText textToCopy="resource-id" />);

      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toHaveFocus();

      await userEvent.keyboard(key);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    }
  );

  it.each([['{enter}'], [' ']])(
    'multi-value popover copy buttons are reachable by Tab and copy with %j',
    async (key) => {
      renderValueCell(['first', 'second']);

      await userEvent.click(screen.getByTestId('multi_value_cell_more_button'));
      const buttons = screen.getAllByRole('button', { name: 'Copy' });
      expect(buttons).toHaveLength(2);

      buttons[1].focus();
      await userEvent.keyboard(key);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    }
  );
});
