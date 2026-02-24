/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  createCase,
  attachAlertsToCase,
  fetchOpenSecurityCases,
  detachAlertsFromCase,
  addCommentToCase,
  type CasesClientLike,
} from './case_operations';

describe('case_operations helpers', () => {
  let logger: MockedLogger;
  let mockCasesClient: jest.Mocked<CasesClientLike>;

  beforeEach(() => {
    logger = loggerMock.create();
    mockCasesClient = {
      cases: {
        create: jest.fn().mockResolvedValue({ id: 'case-1', title: 'Test Case' }),
        find: jest.fn().mockResolvedValue({ cases: [] }),
        get: jest.fn(),
        update: jest.fn(),
        addObservable: jest.fn(),
      },
      attachments: {
        bulkCreate: jest.fn().mockResolvedValue(undefined),
        bulkDelete: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue([]),
        add: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  describe('createCase', () => {
    it('should create a case with extractObservables enabled', async () => {
      const result = await createCase(mockCasesClient, {
        title: 'My Case',
        description: 'Test description',
        severity: 'high',
        tags: ['test-tag'],
      });

      expect(result).toEqual({ id: 'case-1', title: 'Test Case' });
      expect(mockCasesClient.cases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Case',
          description: 'Test description',
          severity: 'high',
          tags: ['test-tag'],
          owner: 'securitySolution',
          settings: { syncAlerts: true, extractObservables: true },
        })
      );
    });

    it('should use default values when optional params are missing', async () => {
      await createCase(mockCasesClient, { title: 'Minimal Case' });

      expect(mockCasesClient.cases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Auto-grouped alerts',
          severity: 'medium',
          tags: ['alert-grouping', 'auto-created'],
        })
      );
    });
  });

  describe('attachAlertsToCase', () => {
    it('should attach alerts in a single batch when <= 100', async () => {
      const alerts = Array.from({ length: 50 }, (_, i) => ({
        id: `alert-${i}`,
        index: '.alerts-security',
      }));

      await attachAlertsToCase(mockCasesClient, 'case-1', alerts);

      expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledTimes(1);
      expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          attachments: expect.arrayContaining([
            expect.objectContaining({ type: 'alert', alertId: 'alert-0' }),
          ]),
        })
      );
    });

    it('should batch alerts when > 100', async () => {
      const alerts = Array.from({ length: 250 }, (_, i) => ({
        id: `alert-${i}`,
        index: '.alerts-security',
      }));

      await attachAlertsToCase(mockCasesClient, 'case-1', alerts);

      // Should be 3 batches: 100 + 100 + 50
      expect(mockCasesClient.attachments.bulkCreate).toHaveBeenCalledTimes(3);
    });

    it('should handle empty alerts array', async () => {
      await attachAlertsToCase(mockCasesClient, 'case-1', []);

      expect(mockCasesClient.attachments.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('fetchOpenSecurityCases', () => {
    it('should fetch and map cases', async () => {
      mockCasesClient.cases.find = jest.fn().mockResolvedValue({
        cases: [
          {
            id: 'c1',
            title: 'Case 1',
            status: 'open',
            observables: [{ typeKey: 'ipv4', value: '1.2.3.4' }],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      });

      const result = await fetchOpenSecurityCases(mockCasesClient, logger);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'c1',
        title: 'Case 1',
        status: 'open',
        observables: [{ typeKey: 'ipv4', value: '1.2.3.4' }],
        alertIds: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    });

    it('should return empty array on error', async () => {
      mockCasesClient.cases.find = jest.fn().mockRejectedValue(new Error('API error'));

      const result = await fetchOpenSecurityCases(mockCasesClient, logger);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('detachAlertsFromCase', () => {
    it('should find and delete matching alert attachments', async () => {
      mockCasesClient.attachments.getAll = jest.fn().mockResolvedValue([
        { id: 'att-1', type: 'alert', alertId: 'alert-1' },
        { id: 'att-2', type: 'alert', alertId: 'alert-2' },
        { id: 'att-3', type: 'user' },
      ]);

      await detachAlertsFromCase(mockCasesClient, logger, 'case-1', ['alert-1']);

      expect(mockCasesClient.attachments.bulkDelete).toHaveBeenCalledWith({
        caseID: 'case-1',
        attachmentIDs: ['att-1'],
      });
    });

    it('should not call bulkDelete when no matching alerts found', async () => {
      mockCasesClient.attachments.getAll = jest
        .fn()
        .mockResolvedValue([{ id: 'att-1', type: 'user' }]);

      await detachAlertsFromCase(mockCasesClient, logger, 'case-1', ['alert-1']);

      expect(mockCasesClient.attachments.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe('addCommentToCase', () => {
    it('should add a user comment to the case', async () => {
      await addCommentToCase(mockCasesClient, 'case-1', 'Test comment');

      expect(mockCasesClient.attachments.add).toHaveBeenCalledWith({
        caseId: 'case-1',
        comment: {
          type: 'user',
          comment: 'Test comment',
          owner: 'securitySolution',
        },
      });
    });
  });
});
