/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { TestProviders } from '../../../common/mock';
import { OverviewTabWrapper } from './overview_tab_wrapper';

jest.mock('@kbn/unified-doc-viewer-plugin/public');
jest.mock('../../../data_view_manager/hooks/use_data_view');

const mockOverviewTab = jest.fn((props: unknown) => <div data-test-subj="overviewTabStub" />);
jest.mock('./overview_tab', () => ({
  OverviewTab: (props: unknown) => mockOverviewTab(props),
}));

const mockDataView = {
  hasMatchedIndices: () => true,
  getIndexPattern: () => 'logs-*',
};

const renderEventOverviewFlyoutContent = () =>
  render(
    <TestProviders>
      <OverviewTabWrapper documentId="doc-id" indexName="my-index" renderCellActions={jest.fn()} />
    </TestProviders>
  );

describe('EventOverviewFlyoutContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: mockDataView,
    });
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Loading, null, jest.fn()]);
  });

  it('fetches clicked document using document id and index', () => {
    renderEventOverviewFlyoutContent();

    expect(useEsDocSearch).toHaveBeenCalledWith({
      id: 'doc-id',
      index: 'my-index',
      dataView: mockDataView,
      skip: false,
    });
  });

  it('renders loading while data view is loading', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'loading',
      dataView: mockDataView,
    });

    const { getByTestId } = renderEventOverviewFlyoutContent();

    expect(getByTestId('analyzer-event-overview-loading')).toBeInTheDocument();
    expect(useEsDocSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });

  it('renders OverviewTab when document is found', () => {
    const hit = { id: '1' } as DataTableRecord;
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, hit, jest.fn()]);

    const { getByTestId } = renderEventOverviewFlyoutContent();

    expect(getByTestId('overviewTabStub')).toBeInTheDocument();
    expect(mockOverviewTab).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
      })
    );
  });

  it('renders not-found state when no document matches', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);

    const { getByTestId } = renderEventOverviewFlyoutContent();

    expect(getByTestId('analyzer-event-overview-not-found')).toBeInTheDocument();
  });

  it('renders error state when document fetch fails', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Error, null, jest.fn()]);

    const { getByTestId } = renderEventOverviewFlyoutContent();

    expect(getByTestId('analyzer-event-overview-fetch-error')).toBeInTheDocument();
  });
});
