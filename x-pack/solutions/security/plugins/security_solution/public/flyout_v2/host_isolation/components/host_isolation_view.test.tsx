/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { HostIsolationView } from './host_isolation_view';
import { HOST_ISOLATION_PANEL_TEST_ID } from '../test_ids';
import { endpointAlertDataMock } from '../../../common/mock/endpoint';

jest.mock('../../../common/components/endpoint/host_isolation', () => ({
  EndpointIsolateSuccess: ({ isolateAction }: { isolateAction: string }) => (
    <div data-test-subj="hostIsolateSuccessBanner">{`${isolateAction}-success`}</div>
  ),
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

jest.mock('../../../common/components/endpoint', () => ({
  useWithCaseDetailsRefresh: () => undefined,
}));

const detailsData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();

describe('<HostIsolationView />', () => {
  it('renders the panel without the success banner initially', () => {
    const { getByTestId, queryByTestId } = render(
      <HostIsolationView
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={jest.fn()}
      />
    );

    expect(getByTestId(HOST_ISOLATION_PANEL_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId('hostIsolateSuccessBanner')).not.toBeInTheDocument();
  });

  it('shows the success banner after the form reports success', () => {
    const { getByTestId } = render(
      <HostIsolationView
        detailsData={detailsData}
        isolateAction="isolateHost"
        onClose={jest.fn()}
      />
    );

    fireEvent.click(getByTestId('hostIsolationSuccess'));

    expect(getByTestId('hostIsolateSuccessBanner')).toHaveTextContent('isolateHost-success');
  });

  it('forwards onClose to the form cancel callback', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <HostIsolationView
        detailsData={detailsData}
        isolateAction="unisolateHost"
        onClose={onClose}
      />
    );

    fireEvent.click(getByTestId('hostIsolationCancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the release banner copy when action is unisolateHost', () => {
    const { getByTestId } = render(
      <HostIsolationView
        detailsData={detailsData}
        isolateAction="unisolateHost"
        onClose={jest.fn()}
      />
    );

    fireEvent.click(getByTestId('hostIsolationSuccess'));

    expect(getByTestId('hostIsolateSuccessBanner')).toHaveTextContent('unisolateHost-success');
  });
});
