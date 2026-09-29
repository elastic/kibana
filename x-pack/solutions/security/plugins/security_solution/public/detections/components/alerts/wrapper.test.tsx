/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  DATA_VIEW_DEGRADED_TEST_ID,
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_PROMPT_TEST_ID,
  SKELETON_TEST_ID,
  Wrapper,
} from './wrapper';
import { TestProviders } from '../../../common/mock';
import type { DataView } from '@kbn/data-views-plugin/public';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

vi.mock('../../../common/hooks/use_experimental_features');
vi.mock('./content', () => {
  const mocked = {
    AlertsPageContent: () => <div data-test-subj={'alerts-page-content'} />,
  };
  return { ...mocked, default: mocked };
});

const dataView: DataView = createStubDataView({ spec: {} });

describe('<Wrapper />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.queryByTestId(DATA_VIEW_DEGRADED_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the content with a warning when the dataView is ready but has no indices', async () => {
    const degradedDataView = {
      ...dataView,
      getIndexPattern: vi.fn().mockReturnValue('.alerts-security.alerts-default'),
      getRuntimeMappings: vi.fn(),
      hasMatchedIndices: vi.fn().mockReturnValue(false),
    } as unknown as DataView;

    render(
      <TestProviders>
        <Wrapper dataView={degradedDataView} status="ready" />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(DATA_VIEW_DEGRADED_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Some data view fields are unavailable')).toBeInTheDocument();
      expect(screen.getByText('.alerts-security.alerts-default')).toBeInTheDocument();
      expect(
        screen.getByText(/Alerts are still listed below, but field-dependent features/)
      ).toBeInTheDocument();
      expect(screen.getByTestId('alerts-page-content')).toBeInTheDocument();
      expect(screen.queryByTestId(DATA_VIEW_ERROR_TEST_ID)).not.toBeInTheDocument();
    });
  });

  it('should render the content', async () => {
    const validDataView = {
      ...dataView,
      id: 'id',
      getIndexPattern: vi.fn().mockReturnValue('title'),
      getRuntimeMappings: vi.fn(),
      hasMatchedIndices: vi.fn().mockReturnValue(true),
    } as unknown as DataView;

    render(
      <TestProviders>
        <Wrapper dataView={validDataView} status="ready" />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId('alerts-page-content')).toBeInTheDocument();
    expect(screen.queryByTestId(DATA_VIEW_DEGRADED_TEST_ID)).not.toBeInTheDocument();
  });
});
