/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  TAKE_ACTION_BUTTON_TEST_ID,
  TAKE_ACTION_POPOVER_MIN_WIDTH,
  TakeAction,
} from './take_action';
import { generateMockIndicator } from '../../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../../common/mock';

describe('TakeAction', () => {
  it('should render an EuiContextMenuPanel', () => {
    const { getByTestId, getAllByText } = render(
      <TestProviders>
        <TakeAction indicator={generateMockIndicator()} />
      </TestProviders>
    );

    expect(getByTestId(TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getAllByText('Take action')).toHaveLength(1);
  });

  it('sets a minimum popover width for expandable action panels', async () => {
    render(
      <MemoryRouter>
        <TestProviders>
          <TakeAction indicator={generateMockIndicator()} />
        </TestProviders>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Take action' }));

    const menu = await screen.findByTestId('alertsTableActionsMenu');
    expect(menu.closest('.euiPopover__panel')).toHaveStyle({
      minWidth: `${TAKE_ACTION_POPOVER_MIN_WIDTH}px`,
    });
  });
});
