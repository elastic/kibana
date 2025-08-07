/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuccessResultMessage } from '.';

jest.mock('../get_formatted_time', () => ({
  getFormattedDate: jest.fn(() => 'mocked-date'),
}));

jest.mock('../../translations', () => ({
  NO_MATCHING_ALERTS_VIA: jest.fn(() => 'no-matching-alerts'),
  RAN_SUCCESSFULLY_VIA_WITH_DISCOVERIES_COUNT: jest.fn(() => 'with-discoveries'),
  RAN_SUCCESSFULLY_VIA_NO_DISCOVERIES_COUNT: jest.fn(() => 'no-discoveries'),
}));

const defaultProps = {
  alertsContextCount: 1,
  connectorName: 'Test Connector',
  dateFormat: 'YYYY-MM-DD',
  discoveries: undefined,
  generationEndTime: '2025-05-30T12:00:00Z',
};

describe('getSuccessResultMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no-matching-alerts when alertsContextCount is 0', () => {
    const result = getSuccessResultMessage({ ...defaultProps, alertsContextCount: 0 });

    expect(result).toBe('no-matching-alerts');
  });

  it('returns with-discoveries when discoveries is not null', () => {
    const result = getSuccessResultMessage({ ...defaultProps, discoveries: 5 });

    expect(result).toBe('with-discoveries');
  });

  it('returns no-discoveries by default', () => {
    const result = getSuccessResultMessage(defaultProps);

    expect(result).toBe('no-discoveries');
  });
});
