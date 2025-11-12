/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import { TestProviders } from '../../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import {
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_PROMPT_TEST_ID,
  DetectionsWrapper,
  SKELETON_TEST_ID,
} from '.';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

jest.mock('../../../../sourcerer/containers');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../data_view_manager/hooks/use_data_view');

const dataView: DataView = createStubDataView({ spec: {} });
const dataViewSpec: DataViewSpec = createStubDataView({ spec: {} }).toSpec();

const renderWrapper = () => {
  render(
    <TestProviders>
      <DetectionsWrapper scope={SourcererScopeName.detections} title="Test Wrapper">
        {() => <div data-test-subj={'detections-page-content'} />}
      </DetectionsWrapper>
    </TestProviders>
  );
};

describe('<DetectionsWrapper />', () => {
  describe('newDataViewPickerEnabled false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      (useDataView as jest.Mock).mockReturnValue({});
    });

    it('should render a loading skeleton while retrieving the dataViewSpec', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: true,
        sourcererDataView: dataViewSpec,
      });

      renderWrapper();

      await waitFor(() => {
        expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render an error if the dataViewSpec is undefined', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: undefined,
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });

    it('should render an error if the dataViewSpec is invalid because id is undefined', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: undefined, title: 'title' },
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });

    it('should render an error if the dataViewSpec is invalid because title is empty', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: 'id', title: '' },
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });

    it('should render the content', async () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: 'id', title: 'title' },
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId('detections-page-content')).toBeInTheDocument();
    });
  });

  describe('newDataViewPickerEnabled true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      (useSourcererDataView as jest.Mock).mockReturnValue({});
    });

    it('should render a loading skeleton if the dataView status is pristine', async () => {
      (useDataView as jest.Mock).mockReturnValue({ dataView, status: 'pristine' });

      renderWrapper();

      await waitFor(() => {
        expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render a loading skeleton if the dataView status is loading', async () => {
      (useDataView as jest.Mock).mockReturnValue({ dataView, status: 'loading' });

      renderWrapper();

      await waitFor(() => {
        expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
      });
    });

    it('should render an error if the dataView status is error', async () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: undefined,
        status: 'error',
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });

    it('should render an error if the dataView status is ready but it has no indices', async () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: {
          ...dataView,
          getRuntimeMappings: jest.fn(),
          hasMatchedIndices: jest.fn().mockReturnValue(false),
        },
        status: 'ready',
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });

    it('should render the content', async () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: {
          ...dataView,
          id: 'id',
          getIndexPattern: jest.fn().mockReturnValue('title'),
          getRuntimeMappings: jest.fn(),
          hasMatchedIndices: jest.fn().mockReturnValue(true),
        },
        status: 'ready',
      });

      renderWrapper();

      expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(await screen.findByTestId('detections-page-content')).toBeInTheDocument();
    });
  });
});
