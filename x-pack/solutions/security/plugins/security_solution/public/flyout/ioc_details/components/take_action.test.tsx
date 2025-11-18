/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TAKE_ACTION_BUTTON_TEST_ID, TakeAction } from './take_action';
import { useIOCDetailsContext } from '../context';
import { generateMockIndicator } from '../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../common/mock';

jest.mock('../context');

describe('TakeAction', () => {
  it('should render an EuiContextMenuPanel', () => {
    (useIOCDetailsContext as jest.Mock).mockReturnValue({
      indicator: generateMockIndicator(),
    });

    const { getByTestId, getAllByText } = render(
      <TestProviders>
        <TakeAction />
      </TestProviders>
    );

    expect(getByTestId(TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Take action')).toHaveLength(1);
  });
});
