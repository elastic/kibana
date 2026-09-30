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
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { TestProviders } from '../../../common/mock';
import { DocumentFlyoutWrapper } from './document_flyout_wrapper';

jest.mock('@kbn/unified-doc-viewer-plugin/public');
jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../timelines/containers/details', () => ({
  useTimelineEventsDetails: jest.fn(() => [false, null, undefined, null, jest.fn()]),
}));

interface MockDocumentFlyoutProps {
  hit?: DataTableRecord;
  dataTestSubj?: string;
  onAlertUpdated: () => void;
}

const mockDocumentFlyout = jest.fn((props: MockDocumentFlyoutProps) => (
  <div data-test-subj="documentFlyoutStub" />
));
jest.mock('.', () => ({
  DocumentFlyout: (props: MockDocumentFlyoutProps) => mockDocumentFlyout(props),
}));

// `_id` and `_index` matter: `useResolvedDocument` tells "still resolving the next document"
// from "showing the requested one" by comparing the hit with the requested document.
const createHit = (
  id: string,
  eventKind: string = 'event',
  index: string = 'my-index'
): DataTableRecord =>
  ({
    id,
    raw: { _id: id, _index: index },
    flattened: { 'event.kind': eventKind },
    isAnchor: false,
  } as DataTableRecord);

const createAlertHit = (): DataTableRecord => createHit('doc-id', 'signal');

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
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      false,
      null,
      undefined,
      null,
      jest.fn(),
    ]);
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
    const nonAlertHit = createHit('doc-id');
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
    const hit = createHit('doc-id');
    const refetchDocument = jest.fn();
    const onAlertUpdated = jest.fn();
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Found,
      hit,
      refetchDocument,
    ]);

    const { getByTestId } = renderDocumentFlyoutWrapper({
      onAlertUpdated,
      dataTestSubj: 'childDocumentFlyout',
    });

    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();
    expect(mockDocumentFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        dataTestSubj: 'childDocumentFlyout',
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

  it('renders a document found by index name when the pinned _index search misses', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([
      false,
      null,
      {
        _id: 'doc-id',
        _index: '.ds-logs-gcp.audit-default-000001',
        _source: { event: { kind: 'event' } },
      },
      null,
      jest.fn(),
    ]);

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper({
      indexName: 'logs-gcp.audit-default',
    });

    expect(queryByTestId('document-overview-wrapper-not-found')).not.toBeInTheDocument();
    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();
    expect(mockDocumentFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({
          raw: expect.objectContaining({ _index: '.ds-logs-gcp.audit-default-000001' }),
        }),
      })
    );
  });

  it('renders a standalone not-found state when no document has ever resolved', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-not-found')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
  });

  it('renders a standalone error state when no document has ever resolved', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Error, null, jest.fn()]);

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-fetch-error')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
  });

  it('renders data view error when the data view failed to load', () => {
    (useDataView as jest.Mock).mockReturnValue({
      status: 'error',
      dataView: mockDataView,
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

  it('still fetches the document when the data view has no matched indices', () => {
    const hit = createHit('doc-id');
    const degradedDataView = {
      ...mockDataView,
      hasMatchedIndices: () => false,
    };
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView: degradedDataView,
    });
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, hit, jest.fn()]);

    const { getByTestId } = renderDocumentFlyoutWrapper();

    expect(useEsDocSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: false,
      })
    );
    expect(getByTestId('document-overview-wrapper-data-view-degraded')).toBeInTheDocument();
    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();
  });

  it('renders the loading state when the request reports found before any hit has arrived', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, null, jest.fn()]);

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-loading')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
    expect(queryByTestId('document-overview-fetch-error')).not.toBeInTheDocument();
    expect(queryByTestId('document-overview-wrapper-not-found')).not.toBeInTheDocument();
  });

  it('shows a loading state instead of the previous document while the next one is fetched', () => {
    const firstHit = createHit('doc-id');
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, firstHit, jest.fn()]);

    const { rerender, getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();

    // `useEsDocSearch` keeps returning `Found` with the previous hit until the newly
    // requested id arrives. That hit must not stay on screen once the pager has moved on.
    rerender(
      <TestProviders>
        <DocumentFlyoutWrapper
          documentId="doc-id-2"
          indexName="my-index"
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('document-overview-wrapper-loading')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
  });

  it('shows a loading state when a stale hit shares `_id` with the next document but lives in a different index', () => {
    const firstHit = createHit('doc-id');
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, firstHit, jest.fn()]);

    const { rerender, getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();

    // `useEsDocSearch` still returns `firstHit` (same `_id`, different index) while it fetches
    // the newly requested document from `other-index`. Without comparing `_index` too, this would
    // be mistaken for the requested document having already resolved.
    rerender(
      <TestProviders>
        <DocumentFlyoutWrapper
          documentId="doc-id"
          indexName="other-index"
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('document-overview-wrapper-loading')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
  });

  it('keeps the current document mounted while it is refetched after a mutation', () => {
    const hit = createHit('doc-id');
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, hit, jest.fn()]);

    const { rerender, getByTestId } = renderDocumentFlyoutWrapper();

    rerender(
      <TestProviders>
        <DocumentFlyoutWrapper
          documentId="doc-id"
          indexName="my-index"
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();
    expect(mockDocumentFlyout).toHaveBeenLastCalledWith(expect.objectContaining({ hit }));
  });

  it.each([
    [ElasticRequestState.NotFound, 'document-overview-wrapper-not-found'],
    [ElasticRequestState.Error, 'document-overview-fetch-error'],
  ])('replaces the previous document with the %s state', (requestState, calloutTestSubj) => {
    const firstHit = createHit('doc-id');
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, firstHit, jest.fn()]);

    const { rerender, getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('documentFlyoutStub')).toBeInTheDocument();

    (useEsDocSearch as jest.Mock).mockReturnValue([requestState, null, jest.fn()]);

    rerender(
      <TestProviders>
        <DocumentFlyoutWrapper
          documentId="deleted-doc-id"
          indexName="my-index"
          renderCellActions={jest.fn()}
          onAlertUpdated={jest.fn()}
        />
      </TestProviders>
    );

    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
    expect(getByTestId(calloutTestSubj)).toBeInTheDocument();
  });

  it('renders the cold loading state when no document has been resolved yet', () => {
    (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Loading, null, jest.fn()]);

    const { getByTestId, queryByTestId } = renderDocumentFlyoutWrapper();

    expect(getByTestId('document-overview-wrapper-loading')).toBeInTheDocument();
    expect(queryByTestId('documentFlyoutStub')).not.toBeInTheDocument();
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
