/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Alert } from '@kbn/alerting-types';
import { PaginatedDocumentFlyout } from './paginated_document_flyout';
import {
  __resetAlertsTablePaginationStoreForTests,
  alertsTablePaginationStore,
} from '../../detections/components/alerts_table/alerts_table_pagination_store';

const mockDocumentFlyout = jest.fn(({ hit }: { hit: DataTableRecord }) => (
  <div data-test-subj="mock-document-flyout" data-hit-id={hit.id} />
));

jest.mock('./main', () => ({
  DocumentFlyout: (props: { hit: DataTableRecord }) => mockDocumentFlyout(props),
}));

const alertA = { _id: 'alert-a', _index: 'idx', 'kibana.alert.uuid': ['a'] } as unknown as Alert;
const alertB = { _id: 'alert-b', _index: 'idx', 'kibana.alert.uuid': ['b'] } as unknown as Alert;

describe('<PaginatedDocumentFlyout />', () => {
  beforeEach(() => {
    __resetAlertsTablePaginationStoreForTests();
    mockDocumentFlyout.mockClear();
  });

  it('renders nothing when no alert is selected', () => {
    const { queryByTestId } = render(<PaginatedDocumentFlyout scopeId="alerts-page" />);

    expect(queryByTestId('mock-document-flyout')).not.toBeInTheDocument();
  });

  it('renders DocumentFlyout with the resolved alert hit', () => {
    act(() => {
      alertsTablePaginationStore.setState({ flyoutAlert: alertA });
    });

    const { getByTestId } = render(<PaginatedDocumentFlyout scopeId="alerts-page" />);

    // `buildDataTableRecord` keys hits by `_index::_id::routing` (see
    // `getDocId`), not by raw `_id`.
    const flyout = getByTestId('mock-document-flyout');
    expect(flyout).toHaveAttribute('data-hit-id', 'idx::alert-a::');
  });

  it('swaps the hit when the alert id changes', () => {
    act(() => {
      alertsTablePaginationStore.setState({ flyoutAlert: alertA });
    });
    const { getByTestId } = render(<PaginatedDocumentFlyout scopeId="alerts-page" />);
    expect(getByTestId('mock-document-flyout')).toHaveAttribute('data-hit-id', 'idx::alert-a::');

    act(() => {
      alertsTablePaginationStore.setState({ flyoutAlert: alertB });
    });

    expect(getByTestId('mock-document-flyout')).toHaveAttribute('data-hit-id', 'idx::alert-b::');
  });

  it('keeps the previous hit while the store is in the loading state with no resolved alert', () => {
    act(() => {
      alertsTablePaginationStore.setState({ flyoutAlert: alertA });
    });
    const { getByTestId } = render(<PaginatedDocumentFlyout scopeId="alerts-page" />);
    expect(getByTestId('mock-document-flyout')).toHaveAttribute('data-hit-id', 'idx::alert-a::');

    // Cross-page click: index advances, loading flips on, but the parallel
    // query has not yet returned the new alert. The wrapper must keep the
    // previously displayed hit so V2's loading branch can render the prior
    // alert's header.
    act(() => {
      alertsTablePaginationStore.setState({
        flyoutAlertIndex: 50,
        isFlyoutAlertLoading: true,
      });
    });

    expect(getByTestId('mock-document-flyout')).toHaveAttribute('data-hit-id', 'idx::alert-a::');
  });
});
