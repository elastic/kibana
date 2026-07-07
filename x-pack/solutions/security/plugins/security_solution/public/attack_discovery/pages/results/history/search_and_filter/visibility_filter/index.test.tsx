/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useInvalidateFindAttackDiscoveries } from '../../../../use_find_attack_discoveries';
import React from 'react';

import { VisibilityFilter } from '.';
import { TestProviders } from '../../../../../../common/mock/test_providers';

jest.mock('../../../../use_find_attack_discoveries', () => ({
  useInvalidateFindAttackDiscoveries: jest.fn(() => jest.fn()),
}));

const defaultProps = {
  setShared: jest.fn(),
};

describe('VisibilityFilter', () => {
  let setShared: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setShared = jest.fn();
  });

  describe('expected options', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <VisibilityFilter {...defaultProps} setShared={setShared} />
        </TestProviders>
      );
      fireEvent.click(screen.getByText('Visibility'));
    });

    it('shows the Not shared option', () => {
      expect(screen.getByText('Not shared')).toBeInTheDocument();
    });

    it('shows the Shared option', () => {
      expect(screen.getByText('Shared')).toBeInTheDocument();
    });
  });

  it('selects both options by default', () => {
    render(
      <TestProviders>
        <VisibilityFilter {...defaultProps} setShared={setShared} />
      </TestProviders>
    );
    fireEvent.click(screen.getByText('Visibility'));
    const checkedOptions = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('aria-checked') === 'true');

    expect(checkedOptions.length).toBe(2);
  });

  it('disables the filter button when loading', () => {
    render(
      <TestProviders>
        <VisibilityFilter {...defaultProps} setShared={setShared} isLoading={true} />
      </TestProviders>
    );

    const button = screen.getByRole('button', { name: /visibility/i });

    expect(button).toBeDisabled();
  });

  it('calls setShared with true when only Shared is selected', () => {
    render(
      <TestProviders>
        <VisibilityFilter {...defaultProps} setShared={setShared} />
      </TestProviders>
    );
    fireEvent.click(screen.getByText('Visibility'));
    // Deselect Not shared first (since both are selected by default)
    const notSharedOption = screen.getByText('Not shared').closest('[role="option"]');
    fireEvent.click(notSharedOption!);

    expect(setShared).toHaveBeenCalledWith(true);
  });

  it('returns setShared called with undefined when only Not shared is selected', () => {
    render(
      <TestProviders>
        <VisibilityFilter {...defaultProps} setShared={setShared} shared={true} />
      </TestProviders>
    );
    fireEvent.click(screen.getByText('Visibility'));
    // Deselect Shared first (since both are selected by default if shared=true)
    const sharedOption = screen.getByText('Shared').closest('[role="option"]');
    fireEvent.click(sharedOption!);

    expect(setShared).toHaveBeenCalledWith(undefined);
  });

  it('calls invalidateFindAttackDiscoveries on change', () => {
    const invalidateFindAttackDiscoveries = jest.fn();
    (useInvalidateFindAttackDiscoveries as jest.Mock).mockImplementation(
      () => invalidateFindAttackDiscoveries
    );

    render(
      <TestProviders>
        <VisibilityFilter {...defaultProps} setShared={setShared} />
      </TestProviders>
    );
    fireEvent.click(screen.getByText('Visibility'));
    // Deselect Not shared to trigger a change
    const notSharedOption = screen.getByText('Not shared').closest('[role="option"]');
    fireEvent.click(notSharedOption!);

    expect(invalidateFindAttackDiscoveries).toHaveBeenCalled();
  });
});
