/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import * as i18n from '../../translations';
import { getFailureResultMessage } from '.';
import { getFormattedDate } from '../get_formatted_time';

vi.mock('../get_formatted_time', () => {
  const mocked = {
    getFormattedDate: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../translations', () => {
  const mocked = {
    FAILED_VIA: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('getFailureResultMessage', () => {
  const mockConnectorName = 'Test Connector';
  const mockDateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
  const mockGenerationEndTime = '2025-05-02T17:46:43.486Z';
  const mockFormattedDate = 'May 2, 2025 @ 17:46:43.486';
  const mockMessage = 'Failed via Test Connector at May 2, 2025 @ 17:46:43.486';

  beforeEach(() => {
    vi.clearAllMocks();
    (getFormattedDate as Mock).mockReturnValue(mockFormattedDate);
    (i18n.FAILED_VIA as Mock).mockReturnValue(mockMessage);
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
