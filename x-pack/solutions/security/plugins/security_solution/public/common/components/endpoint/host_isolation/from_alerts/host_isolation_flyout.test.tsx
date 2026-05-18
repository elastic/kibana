/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  HostIsolationFlyout,
  HOST_ISOLATION_FLYOUT_TEST_ID,
  HOST_ISOLATION_PANEL_TEST_ID,
  HOST_ISOLATION_TITLE_TEST_ID,
} from './host_isolation_flyout';
import { endpointAlertDataMock } from '../../../../mock/endpoint';

const mockAddSuccess = jest.fn();

jest.mock('../../../../hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess }),
}));

jest.mock('../..', () => ({
  useWithCaseDetailsRefresh: () => undefined,
}));

jest.mock('./host_isolation_panel', () => ({
  HostIsolationPanel: ({
    cancelCallback,
    successCallback,
  }: {
    cancelCallback: () => void;
    successCallback: () => void;
  }) => (
    <>
      <button type="button" data-test-subj="hostIsolationCancel" onClick={cancelCallback}>
        {'cancel'}
      </button>
      <button type="button" data-test-subj="hostIsolationSuccess" onClick={successCallback}>
        {'succeed'}
      </button>
    </>
  ),
}));

const hit: DataTableRecord = {
  id: 'alert-1',
  raw: { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
  flattened: { _id: 'alert-1', 'host.name': 'host-a' },
  isAnchor: false,
} as DataTableRecord;

const detailsData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();

describe('<HostIsolationFlyout />', () => {
  beforeEach(() => {
    mockAddSuccess.mockClear();
  });

  it('renders the isolate title for isolateHost action', () => {
    render(
      <HostIsolationFlyout
        hit={hit}
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId(HOST_ISOLATION_TITLE_TEST_ID)).toHaveTextContent('Isolate host');
  });

  it('renders the release title for unisolateHost action', () => {
    render(
      <HostIsolationFlyout
        hit={hit}
        detailsData={detailsData}
        isolateAction="unisolateHost"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId(HOST_ISOLATION_TITLE_TEST_ID)).toHaveTextContent('Release host');
  });

  it('renders the panel', () => {
    render(
      <HostIsolationFlyout
        hit={hit}
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId(HOST_ISOLATION_PANEL_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(HOST_ISOLATION_FLYOUT_TEST_ID)).toBeInTheDocument();
  });

  it('fires the isolation success toast and calls onClose when form reports success', () => {
    const onClose = jest.fn();
    render(
      <HostIsolationFlyout
        hit={hit}
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('hostIsolationSuccess'));

    expect(mockAddSuccess).toHaveBeenCalledWith(expect.stringContaining('host-a'));
    expect(mockAddSuccess.mock.calls[0][0]).toMatch(/[Ii]solation/);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires the release success toast and calls onClose when form reports success', () => {
    const onClose = jest.fn();
    render(
      <HostIsolationFlyout
        hit={hit}
        detailsData={detailsData}
        isolateAction="unisolateHost"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('hostIsolationSuccess'));

    expect(mockAddSuccess).toHaveBeenCalledWith(expect.stringContaining('host-a'));
    expect(mockAddSuccess.mock.calls[0][0]).toMatch(/[Rr]elease/);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the form cancel button is clicked', () => {
    const onClose = jest.fn();
    render(
      <HostIsolationFlyout
        hit={hit}
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('hostIsolationCancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });
});
