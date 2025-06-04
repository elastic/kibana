/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_PROMPT_TEST_ID,
  SKELETON_TEST_ID,
  Wrapper,
} from './wrapper';
import { TestProviders } from '../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useDataViewSpec } from '../../../data_view_manager/hooks/use_data_view_spec';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../sourcerer/containers');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../data_view_manager/hooks/use_data_view_spec');
jest.mock('./content', () => ({
  AlertsPageContent: () => <div data-test-subj={'alert-page-content'} />,
}));

const dataViewSpec: DataViewSpec = createStubDataView({ spec: {} }).toSpec();

describe('<Wrapper />', () => {
  describe('newDataViewPickerEnabled false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    });

    it('should render a loading skeleton while creating the dataView', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({ loading: true });
      (useDataViewSpec as jest.Mock).mockReturnValue({});

      render(<Wrapper />);

      await waitFor(() => {
        expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render an error if the dataView fail to be created correctly', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: undefined,
      });
      (useDataViewSpec as jest.Mock).mockReturnValue({});

      render(<Wrapper />);

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to create data view'
      );
    });

    it('should render the content if the dataView is created correctly', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: 'id' },
      });
      (useDataViewSpec as jest.Mock).mockReturnValue({});

      render(
        <TestProviders>
          <Wrapper />
        </TestProviders>
      );

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId('alert-page-content')).toBeInTheDocument();
    });
  });

  describe('newDataViewPickerEnabled true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    });

    it('should render a loading skeleton while creating the dataView', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({});
      (useDataViewSpec as jest.Mock).mockReturnValue({ status: 'loading' });

      render(<Wrapper />);

      await waitFor(() => {
        expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render an error if the dataView fail to be created correctly', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({});
      (useDataViewSpec as jest.Mock).mockReturnValue({
        dataViewSpec: undefined,
        status: 'ready',
      });

      render(<Wrapper />);

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to create data view'
      );
    });

    it('should render the content if the dataView is created correctly', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({});
      (useDataViewSpec as jest.Mock).mockReturnValue({
        dataViewSpec: { ...dataViewSpec, id: 'id' },
        status: 'ready',
      });

      render(
        <TestProviders>
          <Wrapper />
        </TestProviders>
      );

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId('alert-page-content')).toBeInTheDocument();
    });
  });
});
