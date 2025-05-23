/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TableTabTour } from './table_tab_tour';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  TestProviders,
} from '../../../../common/mock';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import {
  FLYOUT_TABLE_PIN_ACTION_TEST_ID,
  TABLE_TAB_TOUR_TEST_ID,
  TABLE_TAB_SETTING_BUTTON_TEST_ID,
} from './test_ids';

jest.mock('../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, {
  ...storageMock,
});
const mockSetIsPopoverOpen = jest.fn();

const renderTableTabTour = () =>
  render(
    <TestProviders store={mockStore}>
      <TableTabTour setIsPopoverOpen={mockSetIsPopoverOpen} />
      <div data-test-subj={FLYOUT_TABLE_PIN_ACTION_TEST_ID} />
      <div data-test-subj={TABLE_TAB_SETTING_BUTTON_TEST_ID} />
    </TestProviders>
  );

// FLAKY: https://github.com/elastic/kibana/issues/219129
describe.skip('TableTabTour', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        storage: storageMock,
      },
    });

    storageMock.clear();
  });

  it('should render', async () => {
    const { getByTestId, getByText, queryByTestId } = renderTableTabTour();

    await waitFor(() => {
      expect(getByTestId(`${TABLE_TAB_TOUR_TEST_ID}-1`)).toBeVisible();
    });
    fireEvent.click(getByText('Next'));

    await waitFor(() => {
      expect(getByTestId(`${TABLE_TAB_TOUR_TEST_ID}-2`)).toBeVisible();
    });
    fireEvent.click(getByText('Finish tour'));

    await waitFor(() => {
      expect(queryByTestId(`${TABLE_TAB_TOUR_TEST_ID}-1`)).not.toBeInTheDocument();
      expect(queryByTestId(`${TABLE_TAB_TOUR_TEST_ID}-2`)).not.toBeInTheDocument();
    });
  });
});
