/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  mockAlerts,
  sessionViewBasicProcessMock,
} from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { SessionViewDetailPanel } from '.';
import { useDateFormat } from '../../hooks';
import { ENDPOINT_INDEX } from '../../methods';

jest.mock('../../hooks/use_date_format');
const mockUseDateFormat = useDateFormat as jest.Mock;

describe('SessionView component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  const props = {
    index: ENDPOINT_INDEX,
    alerts: [],
    alertsCount: 0,
    selectedProcess: sessionViewBasicProcessMock,
    isFetchingAlerts: false,
    hasNextPageAlerts: false,
    fetchNextPageAlerts: jest.fn(() => true),
    onJumpToEvent: jest.fn((process) => process),
    onShowAlertDetails: jest.fn((alertId) => alertId),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    props.onJumpToEvent.mockReset();
    props.onShowAlertDetails.mockReset();
    props.fetchNextPageAlerts.mockReset();
    mockUseDateFormat.mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  });

  describe('When SessionViewDetailPanel is mounted', () => {
    it('shows process detail by default', async () => {
      renderResult = mockedContext.render(<SessionViewDetailPanel {...props} />);
      expect(renderResult.queryByText('8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726')).toBeVisible();
    });

    it('should should default state with selectedProcess null', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel {...props} selectedProcess={null} />
      );
      expect(renderResult.queryAllByText('entity_id').length).toBe(5);
    });

    it('can switch tabs to show host details', async () => {
      renderResult = mockedContext.render(<SessionViewDetailPanel {...props} />);
      renderResult.queryByText('Metadata')?.click();
      expect(renderResult.queryByText('hostname')).toBeVisible();
      expect(renderResult.queryAllByText('james-fleet-714-2')).toHaveLength(2);
    });

    it('can switch tabs to show alert details', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel {...props} alerts={mockAlerts} alertsCount={mockAlerts.length} />
      );
      renderResult.queryByText('Alerts')?.click();
      expect(renderResult.queryByText('List view')).toBeVisible();
    });
    it('alert tab disabled when no alerts', async () => {
      renderResult = mockedContext.render(<SessionViewDetailPanel {...props} />);
      renderResult.queryByText('Alerts')?.click();
      expect(renderResult.queryByText('List view')).toBeFalsy();
    });
  });
});
