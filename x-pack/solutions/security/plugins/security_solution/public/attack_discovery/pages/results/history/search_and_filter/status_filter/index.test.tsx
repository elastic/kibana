/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { StatusFilter } from '.';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import * as useFindAttackDiscoveriesModule from '../../../../use_find_attack_discoveries';

jest.mock('../../../../use_find_attack_discoveries', () => {
  const actual = jest.requireActual('../../../../use_find_attack_discoveries');
  return {
    ...actual,
    useInvalidateFindAttackDiscoveries: jest.fn(() => jest.fn()),
  };
});

const defaultStatusItems: EuiSelectableOption[] = [
  { checked: 'on' as const, 'data-test-subj': 'open', label: 'Open' },
  { checked: 'on' as const, 'data-test-subj': 'acknowledged', label: 'Acknowledged' },
  { checked: undefined, 'data-test-subj': 'closed', label: 'Closed' },
];

const defaultProps = {
  statusItems: defaultStatusItems,
  setStatusItems: jest.fn(),
};

describe('StatusFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected number of options', () => {
    render(
      <TestProviders>
        <StatusFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('statusFilterButton'));

    expect(screen.getAllByRole('option').length).toBe(defaultStatusItems.length);
  });

  it('returns the correct checked state for open and acknowledged', () => {
    render(
      <TestProviders>
        <StatusFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('statusFilterButton'));
    const checkedOptions = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('aria-checked') === 'true');

    expect(checkedOptions.length).toBe(2);
  });

  it('returns the correct checked state for closed', () => {
    render(
      <TestProviders>
        <StatusFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('statusFilterButton'));
    const checkedOptions = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('aria-checked') === 'false');

    expect(checkedOptions.length).toBe(1);
  });

  it('disables the filter button when loading', () => {
    render(
      <TestProviders>
        <StatusFilter {...defaultProps} isLoading={true} />
      </TestProviders>
    );

    const button = screen.getByTestId('statusFilterButton');

    expect(button).toBeDisabled();
  });

  describe('when an option is changed', () => {
    let setStatusItems: jest.Mock;
    let invalidateFindAttackDiscoveries: jest.Mock;

    beforeEach(() => {
      setStatusItems = jest.fn();
      invalidateFindAttackDiscoveries = jest.fn();
      (
        useFindAttackDiscoveriesModule.useInvalidateFindAttackDiscoveries as jest.Mock
      ).mockImplementation(() => invalidateFindAttackDiscoveries);

      render(
        <TestProviders>
          <StatusFilter {...defaultProps} setStatusItems={setStatusItems} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('statusFilterButton'));
      const options = screen.getAllByRole('option');
      fireEvent.click(options[0]);
    });

    it('calls setStatusItems', () => {
      expect(setStatusItems).toHaveBeenCalled();
    });

    it('calls invalidateFindAttackDiscoveries', () => {
      expect(invalidateFindAttackDiscoveries).toHaveBeenCalled();
    });
  });
});
