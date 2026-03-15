/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getAlertIdsFromCase } from './get_alert_ids_from_case';

const mockGetAllDocumentsAttachedToCase = jest.fn();
const mockGetCasesClientWithRequest = jest.fn().mockResolvedValue({
  attachments: {
    getAllDocumentsAttachedToCase: mockGetAllDocumentsAttachedToCase,
  },
});

const mockCases = {
  getCasesClientWithRequest: mockGetCasesClientWithRequest,
} as never;

const logger = loggingSystemMock.createLogger();
const request = httpServerMock.createKibanaRequest();

describe('getAlertIdsFromCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns alert IDs from case document attachments', async () => {
    mockGetAllDocumentsAttachedToCase.mockResolvedValue([
      { id: 'alert-1', index: '.alerts-security-default', attached_at: '2024-01-01T00:00:00Z' },
      { id: 'alert-2', index: '.alerts-security-default', attached_at: '2024-01-01T00:00:00Z' },
    ]);

    const result = await getAlertIdsFromCase({
      caseId: 'case-123',
      cases: mockCases,
      logger,
      request,
    });

    expect(result).toEqual(['alert-1', 'alert-2']);
  });

  it('returns a single alert ID', async () => {
    mockGetAllDocumentsAttachedToCase.mockResolvedValue([
      { id: 'alert-1', index: '.alerts-security-default', attached_at: '2024-01-01T00:00:00Z' },
    ]);

    const result = await getAlertIdsFromCase({
      caseId: 'case-123',
      cases: mockCases,
      logger,
      request,
    });

    expect(result).toEqual(['alert-1']);
  });

  it('throws when no alerts are attached to the case', async () => {
    mockGetAllDocumentsAttachedToCase.mockResolvedValue([]);

    await expect(
      getAlertIdsFromCase({
        caseId: 'case-123',
        cases: mockCases,
        logger,
        request,
      })
    ).rejects.toThrow('No alerts are attached to case case-123');
  });

  it('passes the correct caseId and attachmentTypes to the cases client', async () => {
    mockGetAllDocumentsAttachedToCase.mockResolvedValue([
      { id: 'alert-1', index: '.alerts-security-default', attached_at: '2024-01-01T00:00:00Z' },
    ]);

    await getAlertIdsFromCase({
      caseId: 'case-456',
      cases: mockCases,
      logger,
      request,
    });

    expect(mockGetAllDocumentsAttachedToCase).toHaveBeenCalledWith({
      caseId: 'case-456',
      attachmentTypes: ['alert'],
    });
  });
});
