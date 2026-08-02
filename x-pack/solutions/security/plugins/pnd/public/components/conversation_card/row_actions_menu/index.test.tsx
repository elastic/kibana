/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { RowActionsMenu } from '.';

const defaultProps = {
  correlationId: 'alert-1',
  onViewLifecycle: jest.fn(),
  title: 'Credential dumping on host-1',
};

const menuButton = (): HTMLElement => screen.getByTestId('pndRowActionsMenuButton');

describe('RowActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('names the row the menu acts on, because every row has the same ellipsis', () => {
    renderWithPndProviders(<RowActionsMenu {...defaultProps} />);

    expect(menuButton()).toHaveAttribute(
      'aria-label',
      'More actions for Credential dumping on host-1'
    );
  });

  it('announces that the trigger opens a menu', () => {
    renderWithPndProviders(<RowActionsMenu {...defaultProps} />);

    expect(menuButton()).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('reports the menu as closed until it is opened', () => {
    renderWithPndProviders(<RowActionsMenu {...defaultProps} />);

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('reports the menu as open once it is opened', () => {
    renderWithPndProviders(<RowActionsMenu {...defaultProps} />);

    fireEvent.click(menuButton());

    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('offers View lifecycle, which is what moved off the row body (D8)', () => {
    renderWithPndProviders(<RowActionsMenu {...defaultProps} />);

    fireEvent.click(menuButton());

    expect(screen.getByTestId('pndRowViewLifecycle')).toHaveTextContent('View lifecycle');
  });

  it('opens the lifecycle of the discovery the row belongs to', () => {
    renderWithPndProviders(<RowActionsMenu {...defaultProps} />);

    fireEvent.click(menuButton());
    fireEvent.click(screen.getByTestId('pndRowViewLifecycle'));

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith('alert-1');
  });

  /**
   * The menu sits inside a row that is itself a button, so a click that reached the row would open
   * the approval modal behind the menu the analyst just opened.
   */
  it('does not activate the row it sits in', () => {
    const onRowClick = jest.fn();

    renderWithPndProviders(
      <div onClick={onRowClick} onKeyDown={onRowClick} role="button" tabIndex={0}>
        <RowActionsMenu {...defaultProps} />
      </div>
    );
    fireEvent.click(menuButton());

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('does not activate the row when a menu item is chosen', () => {
    const onRowClick = jest.fn();

    renderWithPndProviders(
      <div onClick={onRowClick} onKeyDown={onRowClick} role="button" tabIndex={0}>
        <RowActionsMenu {...defaultProps} />
      </div>
    );
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByTestId('pndRowViewLifecycle'));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
