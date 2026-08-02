/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { EntityChip } from '.';

const defaultProps = {
  'data-test-subj': 'entityChip',
  label: 'web-1',
};

const chip = (): HTMLElement => screen.getByTestId('entityChip');

describe('EntityChip', () => {
  it('renders the label', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} />);

    expect(screen.getByText('web-1')).toBeInTheDocument();
  });

  it('renders the count beside the label', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} count={12} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  /** An entity with no count is not an entity with a count of zero. */
  it('renders no count when there is none', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} />);

    expect(chip()).toHaveTextContent(/^web-1$/);
  });

  it('is a button an analyst can press', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} />);

    expect(chip().tagName).toEqual('BUTTON');
  });

  it('calls back when pressed', () => {
    const onClick = jest.fn();

    renderWithPndProviders(<EntityChip {...defaultProps} onClick={onClick} />);
    fireEvent.click(chip());

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * A chip that is filtering the queue has to be distinguishable to a screen reader, not only to an
   * eye: `aria-pressed` is what says "this filter is on" without relying on the danger fill.
   */
  it('announces an active chip as pressed', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} isActive={true} />);

    expect(chip()).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces an inactive chip as not pressed', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} isActive={false} />);

    expect(chip()).toHaveAttribute('aria-pressed', 'false');
  });

  /** A chip that does not toggle anything — `+N`, or collapse — is not a pressed-state control. */
  it('leaves a chip that toggles nothing without a pressed state', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} />);

    expect(chip()).not.toHaveAttribute('aria-pressed');
  });

  it('names the chip for assistive technology when asked to', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} ariaLabel="Filter by host.name web-1" />);

    expect(chip()).toHaveAccessibleName('Filter by host.name web-1');
  });

  it('renders an icon-only chip', () => {
    renderWithPndProviders(
      <EntityChip
        ariaLabel="Show fewer entities"
        data-test-subj="entityChip"
        iconType="arrowLeft"
      />
    );

    expect(chip()).toHaveAccessibleName('Show fewer entities');
  });

  /**
   * The hidden row the overflow measurement reads must not be reachable: a duplicate of every chip,
   * focusable and announced, would double the row for a keyboard and a screen reader both.
   */
  it('renders a chip that is not interactive as a span rather than a button', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} isInteractive={false} />);

    expect(chip().tagName).toEqual('SPAN');
  });

  it('leaves a chip that is not interactive out of the tab order', () => {
    renderWithPndProviders(<EntityChip {...defaultProps} isInteractive={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
