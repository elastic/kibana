/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AiForSOCAlertsTab, CONTENT_TEST_ID, ERROR_TEST_ID, SKELETON_TEST_ID } from './wrapper';
import { TestProviders } from '../../../../../../../common/mock';
import { useFetchIntegrations } from '../../../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useFindRulesQuery } from '../../../../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import { useCreateDataView } from '../../../../../../../common/hooks/use_create_data_view';
import { useDataView } from '../../../../../../../data_view_manager/hooks/use_data_view';

jest.mock('./table', () => ({
  Table: () => <div />,
}));
jest.mock('../../../../../../../common/lib/kibana');
jest.mock('../../../../../../../detections/hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../../../../../detection_engine/rule_management/api/hooks/use_find_rules_query');
jest.mock('../../../../../../../common/hooks/use_create_data_view');
jest.mock('../../../../../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../../../../../common/hooks/use_experimental_features');

const id = 'id';
const query = { ids: { values: ['abcdef'] } };

describe('<AiForSOCAlertsTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: false,
    });
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('should render a loading skeleton while fetching packages (integrations)', async () => {
    (useCreateDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      installedPackages: [],
      isLoading: true,
    });

    render(<AiForSOCAlertsTab id={id} query={query} />);

    expect(await screen.findByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
  });

  describe('when the newDataViewPickerEnabled feature flag is not enabled', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    });

    it('should render a loading skeleton while creating the dataView', async () => {
      (useCreateDataView as jest.Mock).mockReturnValue({
        dataView: undefined,
        loading: true,
      });

      render(<AiForSOCAlertsTab id={id} query={query} />);

      await waitFor(() => {
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render an error if the dataView fail to be created correctly', async () => {
      (useCreateDataView as jest.Mock).mockReturnValue({
        dataView: undefined,
        loading: false,
      });

      jest.mock('react', () => ({
        ...jest.requireActual('react'),
        useEffect: jest.fn((f) => f()),
      }));

      render(<AiForSOCAlertsTab id={id} query={query} />);

      expect(await screen.findByTestId(ERROR_TEST_ID)).toHaveTextContent(
        'Unable to create data view'
      );
    });

    it('should render the content', async () => {
      (useCreateDataView as jest.Mock).mockReturnValue({
        dataView: { getIndexPattern: jest.fn(), id: 'id', toSpec: jest.fn() },
        loading: false,
      });

      jest.mock('react', () => ({
        ...jest.requireActual('react'),
        useEffect: jest.fn((f) => f()),
      }));

      render(
        <TestProviders>
          <AiForSOCAlertsTab id={id} query={query} />
        </TestProviders>
      );

      expect(await screen.findByTestId(CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('when the newDataViewPickerEnabled feature flag is enabled', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    });

    it('should render a loading skeleton while creating the dataView', async () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: undefined,
        status: 'loading',
      });

      render(<AiForSOCAlertsTab id={id} query={query} />);

      await waitFor(() => {
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render an error if the dataView fail to be created correctly', async () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: undefined,
        status: 'ready',
      });

      jest.mock('react', () => ({
        ...jest.requireActual('react'),
        useEffect: jest.fn((f) => f()),
      }));

      render(<AiForSOCAlertsTab id={id} query={query} />);

      expect(await screen.findByTestId(ERROR_TEST_ID)).toHaveTextContent(
        'Unable to create data view'
      );
    });

    it('should render the content', async () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: { getIndexPattern: jest.fn(), id: 'id', toSpec: jest.fn() },
        status: 'ready',
      });

      jest.mock('react', () => ({
        ...jest.requireActual('react'),
        useEffect: jest.fn((f) => f()),
      }));

      render(
        <TestProviders>
          <AiForSOCAlertsTab id={id} query={query} />
        </TestProviders>
      );

      expect(await screen.findByTestId(CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });
});
