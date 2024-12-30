/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import { IndexItem } from './index_item';
import { InferenceUsageInfo } from '../../../../types';
import { useKibana } from '../../../../../../hooks/use_kibana';

jest.mock('../../../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.Mock;
const mockNavigateToApp = jest.fn();

describe('Index Item', () => {
  const item: InferenceUsageInfo = {
    id: 'index-1',
    type: 'Index',
  };
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
      },
    });

    render(<IndexItem usageItem={item} />);
  });

  it('renders', () => {
    expect(screen.getByText('index-1')).toBeInTheDocument();
    expect(screen.getByText('Index')).toBeInTheDocument();
  });

  it('opens index in a new tab', () => {
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('enterpriseSearchContent', {
      openInNewTab: true,
      path: 'search_indices/index-1',
    });
  });
});
