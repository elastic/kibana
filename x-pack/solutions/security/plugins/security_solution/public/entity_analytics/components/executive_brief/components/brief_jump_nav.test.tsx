/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { BriefJumpNav } from './brief_jump_nav';

describe('BriefJumpNav', () => {
  const scrollIntoView = jest.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('renders the entries with counts and scrolls to the section on click', () => {
    render(
      <EuiProvider>
        <div id="sectionA" />
        <div id="sectionB" />
        <BriefJumpNav
          items={[
            { id: 'sectionA', label: 'Priority threats (3)' },
            { id: 'sectionB', label: 'Blind spots (4 gaps)' },
          ]}
        />
      </EuiProvider>
    );

    expect(screen.getByText('Priority threats (3)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Blind spots (4 gaps)'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('sectionB'));
  });
});
