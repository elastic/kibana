/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../../translations';
import { getFailureResultMessage } from '.';
import { getFormattedDate } from '../get_formatted_time';

jest.mock('../get_formatted_time', () => ({
  getFormattedDate: jest.fn(),
}));

jest.mock('../../translations', () => ({
  FAILED_VIA: jest.fn(),
}));

describe('getFailureResultMessage', () => {
  const mockConnectorName = 'Test Connector';
  const mockDateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
  const mockGenerationEndTime = '2025-05-02T17:46:43.486Z';
  const mockFormattedDate = 'May 2, 2025 @ 17:46:43.486';
  const mockMessage = 'Failed via Test Connector at May 2, 2025 @ 17:46:43.486';

  beforeEach(() => {
    jest.clearAllMocks();
    (getFormattedDate as jest.Mock).mockReturnValue(mockFormattedDate);
    (i18n.FAILED_VIA as jest.Mock).mockReturnValue(mockMessage);
  });

  it('invokes FAILED_VIA with the connector name and formatted generation end time', () => {
    getFailureResultMessage({
      connectorName: mockConnectorName,
      dateFormat: mockDateFormat,
      generationEndTime: mockGenerationEndTime,
    });

    expect(i18n.FAILED_VIA).toHaveBeenCalledWith({
      connectorName: mockConnectorName,
      formattedGenerationEndTime: mockFormattedDate,
    });
  });

  it('returns the failure message string', () => {
    const result = getFailureResultMessage({
      connectorName: mockConnectorName,
      dateFormat: mockDateFormat,
      generationEndTime: mockGenerationEndTime,
    });

    expect(result).toBe(mockMessage);
  });
});
