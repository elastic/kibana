/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useSelector } from 'react-redux-v7';
import { CreatedByFilterDropdown } from './created_by_filter_dropdown';
import { CREATED_BY_SELECT_TEST_ID } from './test_ids';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';
import { useLicense } from '../../common/hooks/use_license';
import { useUpsellingMessage } from '../../common/hooks/use_upselling';

vi.mock('../../common/components/user_profiles/use_suggest_users');
vi.mock('../../common/hooks/use_license');
vi.mock('../../common/hooks/use_upselling');

const mockDispatch = vi.fn();
vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');

  return {
    ...original,
    useDispatch: () => mockDispatch,
    useSelector: vi.fn(),
  };
});

describe('UserFilterDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSuggestUsers as Mock).mockReturnValue({
      isLoading: false,
      data: [
        {
          uid: '1',
          user: { username: 'test' },
        },
        {
          uid: '2',
          user: { username: 'elastic' },
        },
      ],
    });
    (useLicense as Mock).mockReturnValue({ isPlatinumPlus: () => true });
    (useUpsellingMessage as Mock).mockReturnValue('upsellingMessage');
    (useSelector as Mock).mockReturnValue(''); // no stored filter by default
  });

  it('should render the component enabled', () => {
    const { getByTestId } = render(<CreatedByFilterDropdown />);

    const dropdown = getByTestId(CREATED_BY_SELECT_TEST_ID);

    expect(dropdown).toBeInTheDocument();
    expect(dropdown).not.toHaveClass('euiComboBox-isDisabled');
  });

  it('should render the dropdown disabled', async () => {
    (useLicense as Mock).mockReturnValue({ isPlatinumPlus: () => false });

    const { getByTestId } = render(<CreatedByFilterDropdown />);

    expect(getByTestId(CREATED_BY_SELECT_TEST_ID)).toHaveClass('euiComboBox-isDisabled');
  });

  it('should call the correct action when select a user', async () => {
    const { getByTestId } = render(<CreatedByFilterDropdown />);

    const userSelect = getByTestId('comboBoxSearchInput');
    userSelect.focus();

    const option = await screen.findByText('test');
    fireEvent.click(option);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should restore the previously selected user from the store on mount', () => {
    (useSelector as Mock).mockReturnValue('1'); // uid matching 'test' user

    render(<CreatedByFilterDropdown />);

    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });

  it('should show no selection when the stored filter is cleared', () => {
    (useSelector as Mock).mockReturnValue('');

    const { getByTestId } = render(<CreatedByFilterDropdown />);

    expect(getByTestId('comboBoxSearchInput')).toHaveValue('');
  });
});
