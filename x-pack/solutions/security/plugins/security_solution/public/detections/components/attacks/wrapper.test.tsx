/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  DATA_VIEW_DEGRADED_TEST_ID,
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_PROMPT_TEST_ID,
  SKELETON_TEST_ID,
  Wrapper,
} from './wrapper';
import { UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID } from './uninitialized_empty_state/uninitialized_data_view_empty_state';
import { TestProviders } from '../../../common/mock';
import { useIsCpsLinkedSearchSpace } from '../../../common/hooks/use_is_cps_linked_search_space';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../common/hooks/use_is_cps_linked_search_space');
jest.mock('./content', () => ({
  AttacksPageContent: () => <div data-test-subj={'attacks-page-content'} />,
}));

const dataView: DataView = createStubDataView({ spec: {} });
const mockUseIsCpsLinkedSearchSpace = useIsCpsLinkedSearchSpace as jest.Mock;

const degradedDataView = {
  ...dataView,
  getName: jest.fn().mockReturnValue('My Data View'),
  getIndexPattern: jest.fn().mockReturnValue('my-pattern-*'),
  getRuntimeMappings: jest.fn(),
  hasMatchedIndices: jest.fn().mockReturnValue(false),
};

describe('<Wrapper />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsCpsLinkedSearchSpace.mockReturnValue({
      isReady: true,
      isLinkedSearchSpace: false,
    });
  });

  it('should render a loading skeleton if the dataView status is pristine', async () => {
    (useDataView as jest.Mock).mockReturnValue({ dataView, status: 'pristine' });

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render a loading skeleton if the dataView status is loading', async () => {
    (useDataView as jest.Mock).mockReturnValue({ dataView, status: 'loading' });

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render a loading skeleton while CPS linked-search status is unresolved and the dataView has no indices', async () => {
    mockUseIsCpsLinkedSearchSpace.mockReturnValue({
      isReady: false,
      isLinkedSearchSpace: false,
    });
    (useDataView as jest.Mock).mockReturnValue({
      dataView: degradedDataView,
      status: 'ready',
    });

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
    expect(screen.queryByTestId(DATA_VIEW_DEGRADED_TEST_ID)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('should render an error if the dataView status is error', async () => {
    (useDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      status: 'error',
    });

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
      'Unable to retrieve the data view'
    );
    expect(screen.queryByTestId(DATA_VIEW_DEGRADED_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the uninitialized empty state when the dataView has no indices outside a CPS linked-search space', async () => {
    (useDataView as jest.Mock).mockReturnValue({
      dataView: degradedDataView,
      status: 'ready',
    });

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(
      await screen.findByTestId(UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID)
    ).toBeInTheDocument();
    expect(screen.queryByTestId(DATA_VIEW_ERROR_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(DATA_VIEW_DEGRADED_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId('attacks-page-content')).not.toBeInTheDocument();
  });

  it('should render the content with a warning when the dataView has no indices in a CPS linked-search space', async () => {
    mockUseIsCpsLinkedSearchSpace.mockReturnValue({
      isReady: true,
      isLinkedSearchSpace: true,
    });
    (useDataView as jest.Mock).mockReturnValue({
      dataView: degradedDataView,
      status: 'ready',
    });

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(DATA_VIEW_DEGRADED_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Some data view fields are unavailable')).toBeInTheDocument();
      expect(screen.getByText('my-pattern-*')).toBeInTheDocument();
      expect(
        screen.getByText(/Attacks are still listed below, but field-dependent features/)
      ).toBeInTheDocument();
      expect(screen.getByTestId('attacks-page-content')).toBeInTheDocument();
      expect(screen.queryByTestId(DATA_VIEW_ERROR_TEST_ID)).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(UNINITIALIZED_DATA_VIEW_EMPTY_STATE_TEST_ID)
      ).not.toBeInTheDocument();
    });
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

    render(
      <TestProviders>
        <Wrapper />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId('attacks-page-content')).toBeInTheDocument();
    expect(screen.queryByTestId(DATA_VIEW_DEGRADED_TEST_ID)).not.toBeInTheDocument();
  });
});
