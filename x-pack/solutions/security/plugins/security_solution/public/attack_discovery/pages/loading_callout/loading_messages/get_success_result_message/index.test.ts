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
  RAN_SUCCESSFULLY_VIA_WITH_SUMMARY: jest.fn(() => 'with-summary'),
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

  describe('summary breakdown', () => {
    const summaryProps = {
      ...defaultProps,
      duplicatesDroppedCount: 2,
      generatedCount: 5,
      persistedCount: 3,
    };

    it('returns with-summary when all summary stats are present', () => {
      const result = getSuccessResultMessage(summaryProps);

      expect(result).toBe('with-summary');
    });

    it('passes hallucinationsFilteredCount when provided', () => {
      const { RAN_SUCCESSFULLY_VIA_WITH_SUMMARY } = jest.requireMock('../../translations');

      getSuccessResultMessage({ ...summaryProps, hallucinationsFilteredCount: 1 });

      expect(RAN_SUCCESSFULLY_VIA_WITH_SUMMARY).toHaveBeenCalledWith(
        expect.objectContaining({ hallucinationsFilteredCount: 1 })
      );
    });

    it('passes hallucinationsFilteredCount as undefined when not provided (custom workflow)', () => {
      const { RAN_SUCCESSFULLY_VIA_WITH_SUMMARY } = jest.requireMock('../../translations');

      getSuccessResultMessage(summaryProps);

      expect(RAN_SUCCESSFULLY_VIA_WITH_SUMMARY).toHaveBeenCalledWith(
        expect.objectContaining({ hallucinationsFilteredCount: undefined })
      );
    });

    it('falls back to with-discoveries when summary stats are absent', () => {
      const result = getSuccessResultMessage({ ...defaultProps, discoveries: 5 });

      expect(result).toBe('with-discoveries');
    });

    it('falls back to no-discoveries when neither summary stats nor discoveries are present', () => {
      const result = getSuccessResultMessage(defaultProps);

      expect(result).toBe('no-discoveries');
    });

    it('no-matching-alerts takes priority over summary stats when alertsContextCount is 0', () => {
      const result = getSuccessResultMessage({ ...summaryProps, alertsContextCount: 0 });

      expect(result).toBe('no-matching-alerts');
    });
  });
});
