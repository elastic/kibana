/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CONTENT_TEST_ID, EaseAlertsTab, ERROR_TEST_ID, SKELETON_TEST_ID } from './wrapper';
import { TestProviders } from '../../../../../../../common/mock';
import { useFetchIntegrations } from '../../../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useCreateEaseAlertsDataView } from '../../../../../../../detections/hooks/alert_summary/use_create_data_view';

jest.mock('./table', () => ({
  Table: () => <div />,
}));
jest.mock('../../../../../../../common/lib/kibana');
jest.mock('../../../../../../../detections/hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../../../../../detections/hooks/alert_summary/use_create_data_view');

const id = 'id';
const query = { ids: { values: ['abcdef'] } };

describe('<EaseAlertsTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: false,
    });
  });

  it('should render a loading skeleton while fetching packages (integrations)', async () => {
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: true,
    });

    render(<EaseAlertsTab id={id} query={query} />);

    expect(await screen.findByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
  });

  it('should render a loading skeleton while creating the dataView', async () => {
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: true,
    });

    render(<EaseAlertsTab id={id} query={query} />);

    await waitFor(() => {
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render an error if the dataView fail to be created correctly', async () => {
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: false,
    });

    jest.mock('react', () => ({
      ...jest.requireActual('react'),
      useEffect: jest.fn((f) => f()),
    }));

    render(<EaseAlertsTab id={id} query={query} />);

    expect(await screen.findByTestId(ERROR_TEST_ID)).toHaveTextContent(
      'Unable to create data view'
    );
  });

  it('should render the content', async () => {
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: { getIndexPattern: jest.fn(), id: 'id', toSpec: jest.fn() },
      loading: false,
    });

    jest.mock('react', () => ({
      ...jest.requireActual('react'),
      useEffect: jest.fn((f) => f()),
    }));

    render(
      <TestProviders>
        <EaseAlertsTab id={id} query={query} />
      </TestProviders>
    );

    expect(await screen.findByTestId(CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
