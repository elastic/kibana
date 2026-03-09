/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AttacksViewOptionsPopover } from './attacks_view_options_popover';
import { TABLE_SECTION_TEST_ID } from './table_section';

describe('AttacksViewOptionsPopover', () => {
  const defaultProps = {
    showAnonymized: false,
    onToggleShowAnonymized: jest.fn(),
    showAttacksOnly: true,
    onToggleShowAttacksOnly: jest.fn(),
  };

  it('renders the view options button', () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);
    expect(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`)).toBeInTheDocument();
  });

  it('opens the popover when the button is clicked', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`)).toBeInTheDocument();
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`)).toBeInTheDocument();
    });
  });

  it('calls onToggleShowAnonymized when the anonymized switch is toggled', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`)).toBeInTheDocument();
    });

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`));
    expect(defaultProps.onToggleShowAnonymized).toHaveBeenCalled();
  });

  it('calls onToggleShowAttacksOnly when the attacks only switch is toggled', async () => {
    const { getByTestId } = render(<AttacksViewOptionsPopover {...defaultProps} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`)).toBeInTheDocument();
    });

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`));
    expect(defaultProps.onToggleShowAttacksOnly).toHaveBeenCalled();
  });

  it('renders switches with correct checked state', async () => {
    const props = {
      ...defaultProps,
      showAnonymized: true,
      showAttacksOnly: false,
    };
    const { getByTestId } = render(<AttacksViewOptionsPopover {...props} />);

    fireEvent.click(getByTestId(`${TABLE_SECTION_TEST_ID}-view-options-button`));

    await waitFor(() => {
      const anonymizedSwitch = getByTestId(`${TABLE_SECTION_TEST_ID}-show-anonymized-switch`);
      const attacksOnlySwitch = getByTestId(`${TABLE_SECTION_TEST_ID}-show-attacks-only-switch`);

      expect(anonymizedSwitch).toHaveAttribute('aria-checked', 'true');
      expect(attacksOnlySwitch).toHaveAttribute('aria-checked', 'false');
    });
  });
});
