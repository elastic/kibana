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
  INVESTIGATE_IN_TIMELINE_TEST_ID,
  ADD_TO_CASE_TEST_ID,
  ADD_TO_BLOCK_LIST_TEST_ID,
} from './take_action';
import { generateMockIndicator } from '../../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../../common/mock';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { useInvestigateInTimeline } from '../../../../threat_intelligence/hooks/use_investigate_in_timeline';
import { extractTimelineCapabilities } from '../../../../common/utils/timeline_capabilities';

jest.mock('../../../../common/hooks/is_in_security_app');
jest.mock('../../../../threat_intelligence/hooks/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: jest.fn(),
}));
jest.mock('../../../../common/utils/timeline_capabilities');

describe('TakeAction', () => {
  beforeEach(() => {
    jest.mocked(useIsInSecurityApp).mockReturnValue(false);
    jest.mocked(useInvestigateInTimeline).mockReturnValue({
      investigateInTimelineFn: jest.fn(),
    } as ReturnType<typeof useInvestigateInTimeline>);
    (extractTimelineCapabilities as jest.Mock).mockReturnValue({ read: true });
  });

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

  it('renders icons for all three menu items when in the security app', async () => {
    jest.mocked(useIsInSecurityApp).mockReturnValue(true);

    render(
      <MemoryRouter>
        <TestProviders>
          <TakeAction indicator={generateMockIndicator()} />
        </TestProviders>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Take action' }));
    await screen.findByTestId('alertsTableActionsMenu');

    expect(
      screen
        .getByTestId(INVESTIGATE_IN_TIMELINE_TEST_ID)
        .querySelector('[data-euiicon-type="timeline"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(ADD_TO_CASE_TEST_ID).querySelector('[data-euiicon-type="briefcase"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(ADD_TO_BLOCK_LIST_TEST_ID).querySelector('[data-euiicon-type="stopSlash"]')
    ).toBeInTheDocument();
  });
});
