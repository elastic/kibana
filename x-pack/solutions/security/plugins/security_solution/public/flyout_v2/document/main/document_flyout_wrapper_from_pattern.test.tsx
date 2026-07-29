/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
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

describe('DocumentFlyoutWrapperFromPattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDataView as jest.Mock).mockReturnValue({
      dataView: { getRuntimeMappings: jest.fn(() => ({})), hasMatchedIndices: jest.fn(() => true) },
      status: 'ready',
    });
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, loading: false });
    // [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject, refetch]
    setEventsDetails([false, [], { _id: '1', _index: 'x', fields: {} }, {}, jest.fn()]);
  });

  it('shows the loading state while the document is being fetched', () => {
    setEventsDetails([true, [], undefined, null, jest.fn()]);
    const { getByTestId } = render(<DocumentFlyoutWrapperFromPattern {...props} />);
    expect(getByTestId('document-from-pattern-wrapper-loading')).toBeInTheDocument();
  });

  it('renders the document flyout once the document is resolved', () => {
    const { getByTestId } = render(<DocumentFlyoutWrapperFromPattern {...props} />);
    expect(getByTestId('document-flyout')).toBeInTheDocument();
  });

  it('shows a not-found callout when no document matches the id across the pattern', () => {
    setEventsDetails([false, [], undefined, null, jest.fn()]);
    const { getByTestId } = render(<DocumentFlyoutWrapperFromPattern {...props} />);
    expect(getByTestId('document-from-pattern-wrapper-not-found')).toBeInTheDocument();
  });
});
