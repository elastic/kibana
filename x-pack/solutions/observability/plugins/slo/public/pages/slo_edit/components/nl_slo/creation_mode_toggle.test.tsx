/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../../utils/test_helper';
import { CreationModeToggle } from './creation_mode_toggle';

describe('CreationModeToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all three mode options', () => {
    render(<CreationModeToggle mode="manual" onChange={mockOnChange} />);

    expect(screen.getByTestId('sloCreationModeManual')).toBeTruthy();
    expect(screen.getByTestId('sloCreationModeAiAssisted')).toBeTruthy();
    expect(screen.getByTestId('sloCreationModeAutoDiscover')).toBeTruthy();
  });

  it('highlights the selected mode', () => {
    render(<CreationModeToggle mode="auto_discover" onChange={mockOnChange} />);

    const autoDiscoverButton = screen.getByTestId('sloCreationModeAutoDiscover');
    expect(autoDiscoverButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onChange when a different mode is selected', () => {
    render(<CreationModeToggle mode="manual" onChange={mockOnChange} />);

    fireEvent.click(screen.getByTestId('sloCreationModeAutoDiscover'));
    expect(mockOnChange).toHaveBeenCalledWith('auto_discover');
  });

  it('shows technical preview badge for AI-assisted mode', () => {
    render(<CreationModeToggle mode="ai_assisted" onChange={mockOnChange} />);

    expect(screen.getByTestId('sloCreationModeTechPreviewBadge')).toBeTruthy();
  });

  it('shows technical preview badge for auto-discover mode', () => {
    render(<CreationModeToggle mode="auto_discover" onChange={mockOnChange} />);

    expect(screen.getByTestId('sloCreationModeTechPreviewBadge')).toBeTruthy();
  });

  it('does not show technical preview badge for manual mode', () => {
    render(<CreationModeToggle mode="manual" onChange={mockOnChange} />);

    expect(screen.queryByTestId('sloCreationModeTechPreviewBadge')).toBeFalsy();
  });

  it('renders the button group legend for accessibility', () => {
    render(<CreationModeToggle mode="manual" onChange={mockOnChange} />);

    expect(screen.getByTestId('sloCreationModeToggle')).toBeTruthy();
  });
});
