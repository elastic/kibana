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
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { TestProviders } from '../../common/mock';
import { DocumentFlyoutWrapper } from './document_flyout_wrapper';

jest.mock('@kbn/unified-doc-viewer-plugin/public');
jest.mock('../../data_view_manager/hooks/use_data_view');
jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const mockDocumentFlyout = jest.fn((props: unknown) => <div data-test-subj="documentFlyoutStub" />);
jest.mock('.', () => ({
  DocumentFlyout: (props: unknown) => mockDocumentFlyout(props),
}));

const createAlertHit = (): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened: { 'event.kind': 'signal' },
    isAnchor: false,
  } as DataTableRecord);

const mockDataView = {
  hasMatchedIndices: () => true,
  getIndexPattern: () => 'logs-*',
};

const renderDocumentFlyoutWrapper = (
  props: Partial<React.ComponentProps<typeof DocumentFlyoutWrapper>> = {}
) =>
  render(
    <TestProviders>
      <DocumentFlyoutWrapper
        documentId="doc-id"
        indexName="my-index"
        renderCellActions={jest.fn()}
        onAlertUpdated={jest.fn()}
        {...props}
      />
    </TestProviders>
  );

describe('DocumentFlyoutWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: mockDataView,
    });
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Loading, null, jest.fn()]);
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });
  });

  it('fetches clicked document using document id and index', () => {
    renderDocumentFlyoutWrapper();

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

    const { getByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-loading')).toBeInTheDocument();
    expect(useEsDocSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });

  it('renders loading while alerts privileges are loading for an alert', () => {
    const alertHit = createAlertHit();
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, alertHit, jest.fn()]);
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: true });

    const { getByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-loading')).toBeInTheDocument();
  });

  it('does not render loading when alerts privileges are loading but document is not an alert', () => {
    const nonAlertHit: DataTableRecord = {
      id: '2',
      raw: {},
      flattened: { 'event.kind': 'event' },
      isAnchor: false,
    } as DataTableRecord;
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      nonAlertHit,
      jest.fn(),
    ]);
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: true });

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(queryByTestId('document-overview-wrapper-loading')).not.toBeInTheDocument();
    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();
  });

  it('renders DocumentFlyout when document is found', () => {
    const hit = { id: '1', raw: {}, flattened: { 'event.kind': 'event' } } as DataTableRecord;
    const refetchDocument = jest.fn();
    const onAlertUpdated = jest.fn();
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      hit,
      refetchDocument,
    ]);

    const { getByTestId } = renderDocumentFlyoutWrapper({ onAlertUpdated });

    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();
    expect(mockDocumentFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        onAlertUpdated: expect.any(Function),
      })
    );

    const latestProps = mockDocumentFlyout.mock.calls.at(-1)?.[0] as {
      onAlertUpdated: () => void;
    };

    latestProps.onAlertUpdated();

    expect(onAlertUpdated).toHaveBeenCalledTimes(1);
    expect(refetchDocument).toHaveBeenCalledTimes(1);
  });

  it('renders not-found state when no document matches', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);

    const { getByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-not-found')).toBeInTheDocument();
  });

  it('renders error state when document fetch fails', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Error, null, jest.fn()]);

    const { getByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-fetch-error')).toBeInTheDocument();
  });

  it('renders data view error when the data view has no matched indices', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: {
        ...mockDataView,
        hasMatchedIndices: () => false,
      },
    });
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);

    const { getByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-data-view-error')).toBeInTheDocument();
    expect(useEsDocSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });

  it('renders nothing when the document request returns found without a hit', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, null, jest.fn()]);

    const { queryByTestId } = renderDocumentFlyoutWrapper();

    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
    expect(queryByTestId('document-overview-fetch-error')).not.toBeInTheDocument();
    expect(queryByTestId('document-overview-wrapper-not-found')).not.toBeInTheDocument();
  });

  it('renders FlyoutMissingAlertsPrivilege when document is an alert and user lacks alerts read privilege', () => {
    const alertHit = createAlertHit();
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, alertHit, jest.fn()]);
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: false });

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
  });
});
