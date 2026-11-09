/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ErrorTimeline } from './error_timeline';
import { MonitorFailedTests } from '../../monitor_details/monitor_errors/failed_tests';
import type { Ping } from '../../../../../../common/runtime_types';

jest.mock('../../monitor_details/monitor_errors/failed_tests', () => ({
  MonitorFailedTests: jest.fn(() => null),
}));

const makePing = (timespan: { gte: string; lt?: string; lte?: string }) =>
  ({
    '@timestamp': '2024-08-30T11:04:00.000Z',
    monitor: { timespan },
    state: { started_at: '2024-08-30T11:03:00.000Z' },
  } as unknown as Ping);

const expectedTime = {
  // started_at minus half of the 2 minute timespan
  from: '2024-08-30T11:02:00.000Z',
  // @timestamp plus half of the 2 minute timespan
  to: '2024-08-30T11:05:00.000Z',
};

describe('ErrorTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pads the window by half the timespan when the stored lt is returned', () => {
    render(
      <ErrorTimeline
        lastTestRun={makePing({ gte: '2024-08-30T11:02:00.000Z', lt: '2024-08-30T11:04:00.000Z' })}
      />
    );

    expect(MonitorFailedTests).toHaveBeenCalledWith(
      expect.objectContaining({ time: expectedTime }),
      expect.anything()
    );
  });

  it('pads the window the same way when synthetic _source returns lte instead of lt', () => {
    render(
      <ErrorTimeline
        lastTestRun={makePing({
          gte: '2024-08-30T11:02:00.000Z',
          lte: '2024-08-30T11:03:59.999Z',
        })}
      />
    );

    expect(MonitorFailedTests).toHaveBeenCalledWith(
      expect.objectContaining({ time: expectedTime }),
      expect.anything()
    );
  });
});
