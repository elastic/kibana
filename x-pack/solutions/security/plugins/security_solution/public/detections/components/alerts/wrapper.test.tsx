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
import type { DataView } from '@kbn/data-views-plugin/public';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('./content', () => ({
  AlertsPageContent: () => <div data-test-subj={'alerts-page-content'} />,
}));

const dataView: DataView = createStubDataView({ spec: {} });

describe('<Wrapper />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a loading skeleton if the dataView status is pristine', async () => {
    render(
      <TestProviders>
        <Wrapper dataView={dataView} status="pristine" />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render a loading skeleton if the dataView status is loading', async () => {
    render(
      <TestProviders>
        <Wrapper dataView={dataView} status="loading" />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render an error if the dataView status is error', async () => {
    render(
      <TestProviders>
        <Wrapper dataView={dataView} status="error" />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
      'Unable to retrieve the data view'
    );
  });

  it('should render an error if the dataView status is ready but it has no indices', async () => {
    const invalidDataView = {
      ...dataView,
      getRuntimeMappings: jest.fn(),
      hasMatchedIndices: jest.fn().mockReturnValue(false),
    } as unknown as DataView;

    render(
      <TestProviders>
        <Wrapper dataView={invalidDataView} status="ready" />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });
  });

  it('should render the content', async () => {
    const validDataView = {
      ...dataView,
      id: 'id',
      getIndexPattern: jest.fn().mockReturnValue('title'),
      getRuntimeMappings: jest.fn(),
      hasMatchedIndices: jest.fn().mockReturnValue(true),
    } as unknown as DataView;

    render(
      <TestProviders>
        <Wrapper dataView={validDataView} status="ready" />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId('alerts-page-content')).toBeInTheDocument();
  });
});
