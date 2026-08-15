/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ERRORS_ROUTE, MONITORS_ROUTE, OVERVIEW_ROUTE } from '../../../../../common/constants';
import { getMonitorsRoute } from './route_config';

jest.mock('./errors/errors_tab', () => ({
  ErrorsTab: () => null,
}));
jest.mock('./overview/overview_page', () => ({
  OverviewPage: () => null,
}));
jest.mock('./monitors_page', () => ({
  MonitorManagementPage: () => null,
}));
jest.mock('./management/page_header/monitors_page_header', () => ({
  MonitorsPageHeader: () => null,
}));
jest.mock('./create_monitor_button', () => ({
  CreateMonitorButton: () => <button data-test-subj="syntheticsCreateMonitorButton" />,
}));
jest.mock('../common/components/refresh_button', () => ({
  RefreshButton: () => <button data-test-subj="syntheticsRefreshButtonButton">Refresh</button>,
}));
jest.mock('../common/date_picker/synthetics_date_picker', () => ({
  SyntheticsDatePicker: () => <div data-test-subj="syntheticsDatePicker" />,
}));

const history = { location: { search: '' } } as any;
const location = { search: '' } as any;

const renderRightSideItems = (path: string) => {
  const route = getMonitorsRoute(history, location, '/app/synthetics', 'Kibana').find(
    (r) => r.path === path
  );
  render(
    <>
      {(route?.pageHeader?.rightSideItems ?? []).map((item, index) => (
        <React.Fragment key={index}>{item}</React.Fragment>
      ))}
    </>
  );
};

describe('getMonitorsRoute rightSideItems', () => {
  it('keeps the shared Refresh button on Management', () => {
    renderRightSideItems(MONITORS_ROUTE);
    expect(screen.getByTestId('syntheticsRefreshButtonButton')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsCreateMonitorButton')).toBeInTheDocument();
  });

  it('drops the shared Refresh button on Overview (date picker covers refresh)', () => {
    renderRightSideItems(OVERVIEW_ROUTE);
    expect(screen.queryByTestId('syntheticsRefreshButtonButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('syntheticsDatePicker')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsCreateMonitorButton')).toBeInTheDocument();
  });

  it('drops the shared Refresh button on Errors (in-page date picker covers refresh)', () => {
    renderRightSideItems(ERRORS_ROUTE);
    expect(screen.queryByTestId('syntheticsRefreshButtonButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('syntheticsCreateMonitorButton')).toBeInTheDocument();
  });
});
