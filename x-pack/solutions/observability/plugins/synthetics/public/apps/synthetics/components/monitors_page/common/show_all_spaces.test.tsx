/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import { ShowAllSpaces } from './show_all_spaces';
import { useHasMultipleSpaces } from '../../../../../hooks/use_has_multiple_spaces';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';

jest.mock('../../../../../hooks/use_has_multiple_spaces');
jest.mock('../../../../../hooks/use_kibana_space');

describe('ShowAllSpaces', () => {
  const useHasMultipleSpacesMock = useHasMultipleSpaces as jest.Mock;
  const useKibanaSpaceMock = useKibanaSpace as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaSpaceMock.mockReturnValue({
      space: { id: 'default', name: 'Default' },
      loading: false,
    });
  });

  it('renders the spaces filter when the user can access multiple spaces', () => {
    useHasMultipleSpacesMock.mockReturnValue({ hasMultipleSpaces: true, loading: false });

    const { getByText } = render(<ShowAllSpaces />);

    expect(getByText('Spaces')).toBeTruthy();
  });

  it('hides the spaces filter when the user can access only one space', () => {
    useHasMultipleSpacesMock.mockReturnValue({ hasMultipleSpaces: false, loading: false });

    const { queryByText } = render(<ShowAllSpaces />);

    expect(queryByText('Spaces')).toBeNull();
  });
});
