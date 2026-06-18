/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { LogEntryExample, LogEntryAnomaly } from '../../../../../../common/log_analysis';
import type { TimeRange } from '../../../../../../common/time/time_range';
import { LogEntryFlyoutProvider } from '../../../../../containers/logs/log_flyout';
import { LogEntryExampleMessageTable } from './log_entry_example';

const mockServices = {
  ml: {
    locator: {
      useUrl: () => '#',
      getUrl: async () => '#',
      getRedirectUrl: () => '#',
    },
  },
  http: {
    basePath: {
      get: () => '',
      prepend: (path: string) => path,
    },
  },
  application: {
    navigateToUrl: jest.fn(),
    navigateToApp: jest.fn(),
    getUrlForApp: () => '#',
  },
};

const timeRange: TimeRange = {
  startTime: new Date('2026-06-12T14:45:00.000Z').valueOf(),
  endTime: new Date('2026-06-12T15:00:00.000Z').valueOf(),
};

const anomaly: LogEntryAnomaly = {
  id: 'example-anomaly',
  anomalyScore: 94.7,
  dataset: 'vsphere.log',
  typical: 150,
  actual: 2600,
  type: 'logRate',
  duration: 900000,
  startTime: timeRange.startTime,
  jobId: 'example-log-entry-rate',
};

const examples: LogEntryExample[] = [
  {
    id: 'example-0',
    dataset: 'vsphere.log',
    message:
      'Hostd: verbose vmsvc.vm:/vmfs/volumes/5f3c2a1b-9d8e7f60/web-frontend-01/web-frontend-01.vmx opID=esxui-3f7a-9c21 user=vpxuser] Failed to power on virtual machine web-frontend-01: insufficient resources on host esxi-04.lab.corp.local, CPU reservation of 4200 MHz could not be satisfied',
    timestamp: timeRange.startTime,
    tiebreaker: 0,
  },
];

const renderTable = () =>
  renderWithKibanaRenderContext(
    <KibanaContextProvider services={mockServices}>
      <LogEntryFlyoutProvider>
        <LogEntryExampleMessageTable examples={examples} timeRange={timeRange} anomaly={anomaly} />
      </LogEntryFlyoutProvider>
    </KibanaContextProvider>
  );

describe('LogEntryExampleMessageTable', () => {
  it('truncates long messages in the message cell to a single line', () => {
    renderTable();

    const rows = screen.getAllByRole('row');
    const dataRow = rows[1];
    const cells = within(dataRow).getAllByRole('cell');
    const messageCell = cells[1];

    const truncatedSpan = messageCell.querySelector('.euiTableCellContent__text');
    expect(truncatedSpan).toBeInTheDocument();
    expect(truncatedSpan).toHaveTextContent(examples[0].message);
  });
});
