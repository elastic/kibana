/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TooltipWithKeyboardShortcut } from '.';

const props = {
  content: <div>{'To pay respect'}</div>,
  shortcut: 'F',
  showShortcut: true,
};

describe('TooltipWithKeyboardShortcut', () => {
  test('it renders the provided content', () => {
    render(<TooltipWithKeyboardShortcut {...props} />);
    expect(screen.getByTestId('content')).toHaveTextContent('To pay respect');
  });

  test('it renders the additionalScreenReaderOnlyContext', () => {
    render(
      <TooltipWithKeyboardShortcut {...props} additionalScreenReaderOnlyContext={'field.name'} />
    );

    const screenOnlyEl = screen.getByTestId('additionalScreenReaderOnlyContext');

    expect(screenOnlyEl).toHaveTextContent('field.name');
    expect(screenOnlyEl.className).toContain('euiScreenReaderOnly');
  });

  test('it renders the expected shortcut', () => {
    render(<TooltipWithKeyboardShortcut {...props} />);

    expect(screen.getByTestId('shortcut')).toHaveTextContent('Press F');
  });
});
