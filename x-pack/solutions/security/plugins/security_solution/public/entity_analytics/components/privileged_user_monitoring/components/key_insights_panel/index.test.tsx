/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { KeyInsightsPanel } from '.';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

// Mock all tile components
jest.mock('./active_privileged_users_tile', () => ({
  ActivePrivilegedUsersTile: jest.fn(({ spaceId, sourcerDataView }) => (
    <div data-test-subj="active-privileged-users-tile">
      <div data-test-subj="space-id">{spaceId}</div>
      <div data-test-subj="dataview-id">{sourcerDataView.id}</div>
    </div>
  )),
}));

jest.mock('./alerts_triggered_tile', () => ({
  AlertsTriggeredTile: jest.fn(({ spaceId }) => (
    <div data-test-subj="alerts-triggered-tile">
      <div data-test-subj="space-id">{spaceId}</div>
    </div>
  )),
}));

jest.mock('./anomalies_detected_tile', () => ({
  AnomaliesDetectedTile: jest.fn(({ spaceId }) => (
    <div data-test-subj="anomalies-detected-tile">
      <div data-test-subj="space-id">{spaceId}</div>
    </div>
  )),
}));

jest.mock('./granted_rights_tile', () => ({
  GrantedRightsTile: jest.fn(({ spaceId, sourcerDataView }) => (
    <div data-test-subj="granted-rights-tile">
      <div data-test-subj="space-id">{spaceId}</div>
      <div data-test-subj="dataview-id">{sourcerDataView.id}</div>
    </div>
  )),
}));

jest.mock('./account_switches_tile', () => ({
  AccountSwitchesTile: jest.fn(({ spaceId, sourcerDataView }) => (
    <div data-test-subj="account-switches-tile">
      <div data-test-subj="space-id">{spaceId}</div>
      <div data-test-subj="dataview-id">{sourcerDataView.id}</div>
    </div>
  )),
}));

jest.mock('./authentications_tile', () => ({
  AuthenticationsTile: jest.fn(({ spaceId, sourcerDataView }) => (
    <div data-test-subj="authentications-tile">
      <div data-test-subj="space-id">{spaceId}</div>
      <div data-test-subj="dataview-id">{sourcerDataView.id}</div>
    </div>
  )),
}));

const mockDataView: DataViewSpec = {
  id: 'test-dataview',
  title: 'test-*',
  fields: {},
  timeFieldName: '@timestamp',
};

describe('KeyInsightsPanel', () => {
  const defaultProps = {
    spaceId: 'test-space',
    sourcerDataView: mockDataView,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tiles', () => {
    const { getByTestId } = render(
      <TestProviders>
        <KeyInsightsPanel {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('active-privileged-users-tile')).toBeInTheDocument();
    expect(getByTestId('alerts-triggered-tile')).toBeInTheDocument();
    expect(getByTestId('anomalies-detected-tile')).toBeInTheDocument();
    expect(getByTestId('granted-rights-tile')).toBeInTheDocument();
    expect(getByTestId('account-switches-tile')).toBeInTheDocument();
    expect(getByTestId('authentications-tile')).toBeInTheDocument();
  });

  it('passes spaceId to all tiles', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <KeyInsightsPanel {...defaultProps} />
      </TestProviders>
    );

    const spaceIdElements = getAllByTestId('space-id');
    expect(spaceIdElements).toHaveLength(6);
    spaceIdElements.forEach((element) => {
      expect(element.textContent).toBe('test-space');
    });
  });

  it('passes sourcerDataView to tiles that need it', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <KeyInsightsPanel {...defaultProps} />
      </TestProviders>
    );

    const dataviewIdElements = getAllByTestId('dataview-id');
    // Only 4 tiles use sourcerDataView: ActivePrivilegedUsers, GrantedRights, AccountSwitches, Authentications
    expect(dataviewIdElements).toHaveLength(4);
    dataviewIdElements.forEach((element) => {
      expect(element.textContent).toBe('test-dataview');
    });
  });

  it('renders with different spaceId', () => {
    const propsWithDifferentSpaceId = {
      ...defaultProps,
      spaceId: 'different-space',
    };

    const { getAllByTestId } = render(
      <TestProviders>
        <KeyInsightsPanel {...propsWithDifferentSpaceId} />
      </TestProviders>
    );

    const spaceIdElements = getAllByTestId('space-id');
    spaceIdElements.forEach((element) => {
      expect(element.textContent).toBe('different-space');
    });
  });

  it('renders with different sourcerDataView', () => {
    const differentDataView: DataViewSpec = {
      ...mockDataView,
      id: 'different-dataview',
      title: 'different-*',
    };

    const propsWithDifferentDataView = {
      ...defaultProps,
      sourcerDataView: differentDataView,
    };

    const { getAllByTestId } = render(
      <TestProviders>
        <KeyInsightsPanel {...propsWithDifferentDataView} />
      </TestProviders>
    );

    const dataviewIdElements = getAllByTestId('dataview-id');
    dataviewIdElements.forEach((element) => {
      expect(element.textContent).toBe('different-dataview');
    });
  });

  it('renders with proper CSS styling', () => {
    const { container } = render(
      <TestProviders>
        <KeyInsightsPanel {...defaultProps} />
      </TestProviders>
    );

    // Check that the main EuiFlexGroup is rendered
    const flexGroup = container.querySelector('.euiFlexGroup');
    expect(flexGroup).toBeInTheDocument();

    // Check that all tiles are wrapped in styled divs
    const tileWrappers = container.querySelectorAll('.euiFlexItem > div');
    expect(tileWrappers).toHaveLength(6);
  });

  it('calls tile components with correct props', () => {
    const ActivePrivilegedUsersTile = jest.requireMock(
      './active_privileged_users_tile'
    ).ActivePrivilegedUsersTile;
    const AlertsTriggeredTile = jest.requireMock('./alerts_triggered_tile').AlertsTriggeredTile;
    const AnomaliesDetectedTile = jest.requireMock(
      './anomalies_detected_tile'
    ).AnomaliesDetectedTile;
    const GrantedRightsTile = jest.requireMock('./granted_rights_tile').GrantedRightsTile;
    const AccountSwitchesTile = jest.requireMock('./account_switches_tile').AccountSwitchesTile;
    const AuthenticationsTile = jest.requireMock('./authentications_tile').AuthenticationsTile;

    render(
      <TestProviders>
        <KeyInsightsPanel {...defaultProps} />
      </TestProviders>
    );

    expect(ActivePrivilegedUsersTile).toHaveBeenCalledWith(
      {
        spaceId: 'test-space',
        sourcerDataView: mockDataView,
      },
      {}
    );

    expect(AlertsTriggeredTile).toHaveBeenCalledWith(
      {
        spaceId: 'test-space',
      },
      {}
    );

    expect(AnomaliesDetectedTile).toHaveBeenCalledWith(
      {
        spaceId: 'test-space',
      },
      {}
    );

    expect(GrantedRightsTile).toHaveBeenCalledWith(
      {
        spaceId: 'test-space',
        sourcerDataView: mockDataView,
      },
      {}
    );

    expect(AccountSwitchesTile).toHaveBeenCalledWith(
      {
        spaceId: 'test-space',
        sourcerDataView: mockDataView,
      },
      {}
    );

    expect(AuthenticationsTile).toHaveBeenCalledWith(
      {
        spaceId: 'test-space',
        sourcerDataView: mockDataView,
      },
      {}
    );
  });
});
