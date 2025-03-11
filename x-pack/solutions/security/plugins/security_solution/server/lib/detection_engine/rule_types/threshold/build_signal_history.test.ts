/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ORIGINAL_TIME } from '../../../../../common/field_maps/field_names';
import { sampleThresholdAlert } from '../__mocks__/threshold';
import { buildThresholdSignalHistory } from './build_signal_history';

describe('buildSignalHistory', () => {
  it('builds a signal history from an alert', () => {
    const signalHistory = buildThresholdSignalHistory({ alerts: [sampleThresholdAlert] });
    expect(signalHistory).toEqual({
      '3db471f26608656e5fe8441088d3015235b441c48e46715e5da2b0cc04cc9675': {
        lastSignalTimestamp: Date.parse(
          sampleThresholdAlert._source[ALERT_ORIGINAL_TIME] as string
        ),
        terms: [
          {
            field: 'host.name',
            value: 'garden-gnomes',
          },
          {
            field: 'source.ip',
            value: '127.0.0.1',
          },
        ],
      },
    });
  });
});
