/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DocumentFlyoutWrapperFromPattern } from './document_flyout_wrapper_from_pattern';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../timelines/containers/details');
jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('@kbn/discover-utils', () => ({
  buildDataTableRecord: jest.fn(() => ({ id: '1', raw: { _id: '1' }, flattened: {} })),
  getFieldValue: jest.fn(() => 'event'),
}));
// Stub the presentational flyout so we don't need its full provider tree.
jest.mock('.', () => ({
  DocumentFlyout: () => <div data-test-subj="document-flyout" />,
}));

const props = {
  documentId: '1',
  indexName: 'logs-*,.alerts-security.alerts-default',
  renderCellActions: () => null,
  onAlertUpdated: jest.fn(),
};

const setEventsDetails = (tuple: unknown[]) =>
  (useTimelineEventsDetails as jest.Mock).mockReturnValue(tuple);

const renderFromPattern = () =>
  render(
    <I18nProvider>
      <DocumentFlyoutWrapperFromPattern {...props} />
    </I18nProvider>
  );

describe('DocumentFlyoutWrapperFromPattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDataView as jest.Mock).mockReturnValue({
      dataView: {
        getRuntimeMappings: jest.fn(() => ({})),
        getIndexPattern: jest.fn(() => 'logs-*'),
        hasMatchedIndices: jest.fn(() => true),
      },
      status: 'ready',
    });
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });
    // [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject, refetch]
    setEventsDetails([false, [], { _id: '1', _index: 'x', fields: {} }, {}, jest.fn()]);
  });

  it('shows the loading state while the document is being fetched', () => {
    setEventsDetails([true, [], undefined, null, jest.fn()]);
    const { getByTestId } = renderFromPattern();
    expect(getByTestId('document-from-pattern-wrapper-loading')).toBeInTheDocument();
  });

  it('renders the document flyout once the document is resolved', () => {
    const { getByTestId } = renderFromPattern();
    expect(getByTestId('document-flyout')).toBeInTheDocument();
  });

  it('shows a not-found callout when no document matches the id across the pattern', () => {
    setEventsDetails([false, [], undefined, null, jest.fn()]);
    const { getByTestId } = renderFromPattern();
    expect(getByTestId('document-from-pattern-wrapper-not-found')).toBeInTheDocument();
  });

  it('shows a data view error when the data view failed to load', () => {
    (useDataView as jest.Mock).mockReturnValue({
      dataView: {
        getRuntimeMappings: jest.fn(() => ({})),
        getIndexPattern: jest.fn(() => 'logs-*'),
        hasMatchedIndices: jest.fn(() => true),
      },
      status: 'error',
    });

    const { getByTestId } = renderFromPattern();

    expect(getByTestId('document-from-pattern-wrapper-data-view-error')).toBeInTheDocument();
    expect(useTimelineEventsDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });

  it('still fetches the document when the data view has no matched indices', () => {
    (useDataView as jest.Mock).mockReturnValue({
      dataView: {
        getRuntimeMappings: jest.fn(() => ({})),
        getIndexPattern: jest.fn(() => 'logs-*'),
        hasMatchedIndices: jest.fn(() => false),
      },
      status: 'ready',
    });

    const { getByTestId } = renderFromPattern();

    expect(useTimelineEventsDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: false,
      })
    );
    expect(getByTestId('document-from-pattern-wrapper-data-view-degraded')).toBeInTheDocument();
    expect(getByTestId('document-flyout')).toBeInTheDocument();
  });
});
